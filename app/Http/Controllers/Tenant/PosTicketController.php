<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\PosCatalogItem;
use App\Models\PosCategory;
use App\Models\PosDiscount;
use App\Models\PosPayment;
use App\Models\PosPaymentMethod;
use App\Models\PosShift;
use App\Models\PosStockMovement;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class PosTicketController extends Controller
{
    public function index(Request $request): Response
    {
        $activeShift = PosShift::where('estado', 'abierto')->first();

        $catalog = PosCategory::where('activo', true)
            ->with(['items' => fn($q) => $q->where('activo', true)->orderBy('nombre')])
            ->orderBy('orden')
            ->get();

        $paymentMethods = PosPaymentMethod::where('activo', true)->orderBy('orden')->get(['id', 'nombre']);
        $discounts = PosDiscount::where('activo', true)->get(['id', 'nombre', 'tipo', 'valor', 'codigo']);

        $openTickets = PosTicket::with(['owner:id,nombre,apellidos,telefono', 'lines'])
            ->where('estado', 'abierto')
            ->latest()
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'folio' => $t->folio,
                'owner' => $t->owner?->nombre_completo,
                'total' => $t->total,
                'lines_count' => $t->lines->count(),
                'created_at' => $t->created_at,
            ]);

        return Inertia::render('Pos/Index', [
            'activeShift' => $activeShift,
            'catalog' => $catalog,
            'paymentMethods' => $paymentMethods,
            'discounts' => $discounts,
            'openTickets' => $openTickets,
            'openTicketId' => $request->integer('ticket') ?: null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $shift = PosShift::where('estado', 'abierto')->first();

        $folio = $this->nextFolio();

        $ticket = PosTicket::create([
            'folio' => $folio,
            'owner_id' => $request->owner_id,
            'estado' => 'abierto',
            'shift_open_id' => $shift?->id,
            'user_open_id' => auth()->id(),
            'user_last_edit_id' => auth()->id(),
            'subtotal' => 0,
            'total' => 0,
        ]);

        return response()->json(['ticket' => $ticket->load(['owner:id,nombre,apellidos', 'lines.item'])]);
    }

    public function show(PosTicket $ticket): JsonResponse
    {
        $ticket->load(['owner:id,nombre,apellidos,telefono', 'lines.item:id,nombre,tipo', 'payments.paymentMethod:id,nombre', 'discount:id,nombre,tipo,valor']);
        return response()->json(['ticket' => $ticket]);
    }

    public function addLine(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate([
            'item_id' => 'required|exists:pos_catalog_items,id',
            'cantidad' => 'required|integer|min:1',
        ]);

        $item = PosCatalogItem::findOrFail($data['item_id']);

        $existing = PosTicketLine::where('ticket_id', $ticket->id)->where('item_id', $item->id)->first();

        if ($existing) {
            $newCantidad = (float) $existing->cantidad + (int) $data['cantidad'];
            $existing->update([
                'cantidad' => $newCantidad,
                'subtotal' => round((float) $existing->precio_snapshot * $newCantidad, 2),
            ]);
        } else {
            PosTicketLine::create([
                'ticket_id'       => $ticket->id,
                'item_id'         => $item->id,
                'nombre_snapshot' => $item->nombre,
                'precio_snapshot' => $item->precio,
                'costo_snapshot'  => $item->costo ?? 0,
                'cantidad'        => $data['cantidad'],
                'subtotal'        => round((float) $item->precio * $data['cantidad'], 2),
            ]);
        }

        $this->recalculate($ticket);

        return response()->json($this->ticketResponse($ticket));
    }

    public function removeLine(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate(['line_id' => 'required|exists:pos_ticket_lines,id']);

        PosTicketLine::where('id', $data['line_id'])->where('ticket_id', $ticket->id)->delete();

        $this->recalculate($ticket);

        return response()->json($this->ticketResponse($ticket));
    }

    public function updateLine(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate([
            'line_id'  => 'required|exists:pos_ticket_lines,id',
            'cantidad' => 'required|integer|min:1',
        ]);

        $line = PosTicketLine::where('id', $data['line_id'])->where('ticket_id', $ticket->id)->firstOrFail();
        $line->update([
            'cantidad' => $data['cantidad'],
            'subtotal' => round((float) $line->precio_snapshot * $data['cantidad'], 2),
        ]);

        $this->recalculate($ticket);

        return response()->json($this->ticketResponse($ticket));
    }

    public function applyDiscount(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate(['discount_id' => 'nullable|exists:pos_discounts,id']);

        $ticket->discount_id = $data['discount_id'];
        $ticket->save();

        $this->recalculate($ticket);

        return response()->json($this->ticketResponse($ticket));
    }

    public function setOwner(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate(['owner_id' => 'nullable|exists:owners,id']);

        $ticket->update(['owner_id' => $data['owner_id'], 'user_last_edit_id' => auth()->id()]);

        return response()->json($this->ticketResponse($ticket));
    }

    public function pay(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate([
            'payments' => 'required|array|min:1',
            'payments.*.payment_method_id' => 'required|exists:pos_payment_methods,id',
            'payments.*.monto' => 'required|numeric|min:0.01',
        ]);

        $totalPagado = collect($data['payments'])->sum('monto');

        if (abs($totalPagado - $ticket->total) > 0.01) {
            return response()->json(['error' => "El monto pagado no coincide con el total."], 422);
        }

        DB::transaction(function () use ($ticket, $data) {
            $shift = PosShift::where('estado', 'abierto')->first();

            foreach ($data['payments'] as $pago) {
                PosPayment::create([
                    'ticket_id' => $ticket->id,
                    'payment_method_id' => $pago['payment_method_id'],
                    'monto' => $pago['monto'],
                ]);
            }

            // Descontar stock de productos
            foreach ($ticket->lines as $line) {
                $item = PosCatalogItem::find($line->item_id);
                if ($item && $item->tipo === 'producto') {
                    $stockAntes = $item->stock;
                    $item->decrement('stock', $line->cantidad);
                    PosStockMovement::create([
                        'item_id' => $item->id,
                        'ticket_id' => $ticket->id,
                        'tipo' => 'venta',
                        'cantidad' => -$line->cantidad,
                        'stock_anterior' => $stockAntes,
                        'stock_nuevo' => $stockAntes - $line->cantidad,
                        'user_id' => auth()->id(),
                    ]);
                }
            }

            $ticket->update([
                'estado' => 'pagado',
                'shift_close_id' => $shift?->id,
                'user_close_id' => auth()->id(),
                'cobrado_at' => now(),
            ]);
        });

        $ticket->load(['owner:id,nombre,apellidos,telefono', 'lines', 'discount']);

        $waSent = $this->trySendWhatsapp($ticket);

        return response()->json([
            'ok'      => true,
            'folio'   => $ticket->folio,
            'wa_sent' => $waSent,
        ]);
    }

    private function trySendWhatsapp(PosTicket $ticket): bool
    {
        $phone = preg_replace('/\D/', '', $ticket->owner?->telefono ?? '');
        if (!$phone) return false;

        $tenant = currentTenant();
        $tenant->load('ghlConfig');
        $webhookUrl = $tenant->ghlConfig?->webhook_whatsapp_pos;
        if (!$webhookUrl) return false;

        $lineas = $ticket->lines->map(fn($l) =>
            "• {$l->nombre_snapshot} ×{$l->cantidad}  $" . number_format($l->subtotal, 2, '.', ',')
        )->implode("\n");

        $ticketUrl = url("/t/{$ticket->token}");

        $mensaje = "🧾 *Ticket #{$ticket->folio}*\n\n{$lineas}";

        if (($ticket->discount_amount ?? 0) > 0) {
            $mensaje .= "\n_Descuento: -$" . number_format($ticket->discount_amount, 2, '.', ',') . "_";
        }

        $mensaje .= "\n\n💰 *Total: $" . number_format($ticket->total, 2, '.', ',') . "*";
        $mensaje .= "\n\n🔗 Ver tu ticket: {$ticketUrl}";
        $mensaje .= "\n\n¡Gracias por su visita! 🐾";

        try {
            Http::timeout(8)->post($webhookUrl, [
                'phone'      => $phone,
                'message'    => $mensaje,
                'ticket_id'  => $ticket->id,
                'ticket_url' => $ticketUrl,
            ]);
            return true;
        } catch (\Exception) {
            return false;
        }
    }

    public function cancel(Request $request, PosTicket $ticket): RedirectResponse
    {
        $data = $request->validate(['comentario_cancelacion' => 'nullable|string|max:500']);

        $ticket->update([
            'estado' => 'cancelado',
            'comentario_cancelacion' => $data['comentario_cancelacion'],
        ]);

        return redirect()->route('pos.index')->with('success', "Ticket #{$ticket->folio} cancelado.");
    }

    public function history(Request $request): Response
    {
        $tickets = PosTicket::with(['owner:id,nombre,apellidos', 'payments.paymentMethod:id,nombre'])
            ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
            ->when($request->fecha, fn($q, $f) => $q->whereDate('created_at', $f))
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn($t) => [
                'id' => $t->id,
                'folio' => $t->folio,
                'token' => $t->token,
                'owner' => $t->owner?->nombre_completo ?? 'Sin cliente',
                'estado' => $t->estado,
                'subtotal' => $t->subtotal,
                'total' => $t->total,
                'cobrado_at' => $t->cobrado_at,
                'created_at' => $t->created_at,
            ]);

        return Inertia::render('Pos/History', [
            'tickets' => $tickets,
            'filters' => $request->only('estado', 'fecha'),
        ]);
    }

    // --- Helpers ---

    private function ticketResponse(PosTicket $ticket): array
    {
        return ['ticket' => $ticket->fresh()->load(['owner:id,nombre,apellidos,telefono', 'lines.item', 'discount'])];
    }

    private function authorize_ticket(PosTicket $ticket): void
    {
        abort_if($ticket->estado !== 'abierto', 403, 'El ticket ya fue procesado.');
    }

    private function recalculate(PosTicket $ticket): void
    {
        $ticket->refresh();
        $subtotal = $ticket->lines()->sum('subtotal');

        $discountAmount = 0;
        if ($ticket->discount_id) {
            $discount = PosDiscount::find($ticket->discount_id);
            if ($discount) {
                $discountAmount = $discount->tipo === 'porcentaje'
                    ? round($subtotal * $discount->valor / 100, 2)
                    : min($discount->valor, $subtotal);
            }
        }

        $ticket->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'total' => max(0, $subtotal - $discountAmount),
            'user_last_edit_id' => auth()->id(),
        ]);
    }

    private function nextFolio(): int
    {
        $config = \App\Models\PosConfig::where('clave', 'folio_siguiente')->first();
        $folio = $config ? (int) $config->valor : 1;

        if ($config) {
            $config->update(['valor' => $folio + 1]);
        } else {
            \App\Models\PosConfig::create(['clave' => 'folio_siguiente', 'valor' => $folio + 1]);
        }

        return $folio;
    }
}
