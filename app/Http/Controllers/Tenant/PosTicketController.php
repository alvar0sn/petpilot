<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\MembershipCredit;
use App\Models\MembershipCreditMovement;
use App\Models\MembershipRenewal;
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
use App\Models\PosTicketRefund;
use App\Services\GhlService;
use App\Services\PaymentRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $ticket->load(['owner:id,nombre,apellidos,telefono', 'lines.item:id,nombre,tipo', 'payments.paymentMethod:id,nombre', 'discount:id,nombre,tipo,valor', 'paymentRequests' => fn($q) => $q->latest()->limit(1)]);
        return response()->json(['ticket' => $ticket]);
    }

    public function addLine(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate([
            'item_id' => 'required|exists:pos_catalog_items,id',
            'cantidad' => 'required|integer|min:1',
        ]);

        try {
            DB::transaction(function () use ($ticket, $data) {
                $item = PosCatalogItem::findOrFail($data['item_id']);

                $this->reserveStock($item->id, $data['cantidad'], $ticket->id);

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
            });
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $this->recalculate($ticket);

        return response()->json($this->ticketResponse($ticket));
    }

    public function removeLine(Request $request, PosTicket $ticket): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate(['line_id' => 'required|exists:pos_ticket_lines,id']);

        DB::transaction(function () use ($ticket, $data) {
            $line = PosTicketLine::where('id', $data['line_id'])->where('ticket_id', $ticket->id)->first();
            if ($line) {
                $this->releaseStock($line->item_id, $line->cantidad, $ticket->id);
                $line->delete();
            }
        });

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

        try {
            DB::transaction(function () use ($ticket, $data) {
                $line = PosTicketLine::where('id', $data['line_id'])->where('ticket_id', $ticket->id)->firstOrFail();
                $delta = $data['cantidad'] - (float) $line->cantidad;

                if ($delta > 0) {
                    $this->reserveStock($line->item_id, $delta, $ticket->id);
                } elseif ($delta < 0) {
                    $this->releaseStock($line->item_id, abs($delta), $ticket->id);
                }

                $line->update([
                    'cantidad' => $data['cantidad'],
                    'subtotal' => round((float) $line->precio_snapshot * $data['cantidad'], 2),
                ]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

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

    public function pay(Request $request, PosTicket $ticket, GhlService $ghl): JsonResponse
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

            // El stock de productos ya se reservó al agregar los renglones al ticket
            // (ver addLine/updateLine) — aquí ya no hay nada que descontar.

            $ticket->update([
                'estado' => 'pagado',
                'shift_close_id' => $shift?->id,
                'user_close_id' => auth()->id(),
                'cobrado_at' => now(),
            ]);
        });

        $ticket->load(['owner:id,nombre,apellidos,telefono,email,ghl_contact_id', 'lines', 'discount']);

        $waSent = $ghl->notifyTicketPaid($ticket);

        return response()->json([
            'ok'      => true,
            'folio'   => $ticket->folio,
            'wa_sent' => $waSent,
        ]);
    }

    public function createPaymentRequest(Request $request, PosTicket $ticket, PaymentRequestService $service): JsonResponse
    {
        $this->authorize_ticket($ticket);

        $data = $request->validate(['notas' => 'nullable|string|max:255']);

        try {
            $result = $service->createForTicket($ticket, $data['notas'] ?? null);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json([
            'ok' => true,
            'link' => $result['link'],
            'wa_sent' => $result['wa_sent'],
            'payment_request' => [
                'id' => $result['request']->id,
                'estado' => $result['request']->estado,
            ],
        ]);
    }

    public function cancel(Request $request, PosTicket $ticket): RedirectResponse
    {
        abort_if($ticket->estado !== 'abierto', 403, 'Solo se pueden cancelar tickets abiertos.');

        DB::transaction(function () use ($ticket) {
            foreach ($ticket->lines as $line) {
                $this->releaseStock($line->item_id, $line->cantidad, $ticket->id);
            }
            $ticket->update(['estado' => 'cancelado']);
        });

        return redirect()->route('pos.index')->with('success', "Ticket #{$ticket->folio} cancelado.");
    }

    public function refund(Request $request, PosTicket $ticket): RedirectResponse
    {
        abort_if($ticket->estado !== 'pagado', 403, 'Solo se pueden reembolsar tickets pagados.');

        $data = $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'payment_method_id' => 'required|exists:pos_payment_methods,id',
            'motivo' => 'required|string|max:255',
        ]);

        if ($data['monto'] > $ticket->refundableAmount() + 0.01) {
            return back()->withErrors(['monto' => 'El monto excede el saldo reembolsable del ticket.']);
        }

        $shift = PosShift::where('estado', 'abierto')->first();
        if (! $shift) {
            return back()->withErrors(['error' => 'Debes abrir un turno para procesar reembolsos.']);
        }

        DB::transaction(function () use ($ticket, $shift, $data) {
            PosTicketRefund::create([
                'ticket_id' => $ticket->id,
                'shift_id' => $shift->id,
                'payment_method_id' => $data['payment_method_id'],
                'user_id' => auth()->id(),
                'monto' => $data['monto'],
                'motivo' => $data['motivo'],
                // ver nota en PosShiftController::addMovement() — useCurrent() es UTC,
                // se fija explícito en la zona de la app para filtrar por fecha bien.
                'created_at' => now(),
            ]);

            $ticket->increment('refunded_amount', $data['monto']);

            // Un reembolso total revierte la renovación de membresía que ese
            // ticket haya pagado (periodo + créditos otorgados). Uno parcial no
            // toca la membresía.
            if ($ticket->refundableAmount() <= 0.01) {
                $this->reverseMembershipRenewal($ticket);
            }
        });

        return back()->with('success', "Reembolso registrado en el ticket #{$ticket->folio}.");
    }

    /**
     * Revierte la renovación de membresía asociada a este ticket (si la hay y
     * sigue siendo la más reciente sin reembolsar) al reembolsarlo por completo.
     */
    private function reverseMembershipRenewal(PosTicket $ticket): void
    {
        $renewal = MembershipRenewal::where('pos_ticket_id', $ticket->id)
            ->where('reembolsada', false)
            ->first();

        if (! $renewal) {
            return;
        }

        $masReciente = MembershipRenewal::where('membership_id', $renewal->membership_id)
            ->where('reembolsada', false)
            ->orderByDesc('fecha_fin')
            ->first();

        if (! $masReciente || $masReciente->id !== $renewal->id) {
            // Ya hay una renovación posterior sin reembolsar — revertir esta
            // automáticamente descuadraría las fechas. Requiere ajuste manual.
            return;
        }

        $membership = Membership::with('credits')->find($renewal->membership_id);
        if (! $membership) {
            return;
        }

        $movimientos = MembershipCreditMovement::where('referencia_tipo', 'renovacion')
            ->where('referencia_id', $renewal->id)
            ->get();

        foreach ($movimientos as $mov) {
            $credit = MembershipCredit::find($mov->credit_id);
            if (! $credit) {
                continue;
            }

            $saldoAntes = $credit->saldo_actual;
            $saldoNuevo = max(0, $saldoAntes - $mov->cantidad);
            $credit->update(['saldo_actual' => $saldoNuevo]);

            MembershipCreditMovement::create([
                'membership_id' => $membership->id,
                'credit_id' => $credit->id,
                'servicio_tipo' => $credit->servicio_tipo,
                'tipo' => 'ajuste',
                'cantidad' => $saldoNuevo - $saldoAntes,
                'saldo_antes' => $saldoAntes,
                'saldo_despues' => $saldoNuevo,
                'referencia_tipo' => 'renovacion',
                'referencia_id' => $renewal->id,
                'notas' => "Reversión por reembolso del ticket #{$ticket->folio}",
            ]);
        }

        $nuevaFechaVencimiento = $membership->fecha_vencimiento->clone()->subDays($renewal->dias_agregados);

        $membership->update([
            'fecha_vencimiento' => $nuevaFechaVencimiento,
            'activa' => $nuevaFechaVencimiento->isPast() ? false : $membership->activa,
        ]);

        $renewal->update(['reembolsada' => true]);
    }

    public function history(Request $request): Response
    {
        $tickets = PosTicket::with(['owner:id,nombre,apellidos', 'payments.paymentMethod:id,nombre'])
            ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
            ->when($request->fecha, fn($q, $f) => $q->whereDate('created_at', $f))
            ->when($request->owner_id, fn($q, $id) => $q->where('owner_id', $id))
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn($t) => [
                'id' => $t->id,
                'folio' => $t->folio,
                'token' => $t->token,
                'owner' => $t->owner?->nombre_completo ?? 'Sin cliente',
                'estado' => $t->estado,
                'estado_display' => $t->displayEstado(),
                'subtotal' => $t->subtotal,
                'total' => $t->total,
                'refunded_amount' => $t->refunded_amount,
                'saldo_reembolsable' => $t->refundableAmount(),
                'cobrado_at' => $t->cobrado_at,
                'created_at' => $t->created_at,
            ]);

        return Inertia::render('Pos/History', [
            'tickets' => $tickets,
            'filters' => $request->only('estado', 'fecha', 'owner_id'),
            'selectedOwner' => $request->owner_id
                ? Owner::select('id', 'nombre', 'apellidos')->find($request->owner_id)
                : null,
            'paymentMethods' => PosPaymentMethod::where('activo', true)->orderBy('orden')->get(['id', 'nombre']),
        ]);
    }

    // --- Helpers ---

    private function ticketResponse(PosTicket $ticket): array
    {
        return ['ticket' => $ticket->fresh()->load(['owner:id,nombre,apellidos,telefono', 'lines.item', 'discount', 'paymentRequests' => fn($q) => $q->latest()->limit(1)])];
    }

    private function authorize_ticket(PosTicket $ticket): void
    {
        abort_if($ticket->estado !== 'abierto', 403, 'El ticket ya fue procesado.');
    }

    /**
     * Reserva (descuenta) stock de un item tipo 'producto' de forma atómica.
     * No hace nada si el item no existe o no es un producto con stock. Lanza
     * RuntimeException si no alcanza — el llamador debe correr esto dentro de
     * un DB::transaction() para que el lockForUpdate() sirva de algo.
     */
    private function reserveStock(?int $itemId, float $cantidad, ?int $ticketId, string $tipo = 'venta'): void
    {
        if (!$itemId) return;

        $item = PosCatalogItem::where('id', $itemId)->lockForUpdate()->first();
        if (!$item || $item->tipo !== 'producto') return;

        if ($item->stock < $cantidad) {
            throw new \RuntimeException("Stock insuficiente de \"{$item->nombre}\" (disponible: {$item->stock}).");
        }

        $stockAntes = $item->stock;
        $item->decrement('stock', $cantidad);

        PosStockMovement::create([
            'item_id' => $item->id,
            'ticket_id' => $ticketId,
            'tipo' => $tipo,
            'cantidad' => -$cantidad,
            'stock_anterior' => $stockAntes,
            'stock_nuevo' => $stockAntes - $cantidad,
            'user_id' => auth()->id(),
            'created_at' => now(),
        ]);
    }

    /**
     * Libera (devuelve) stock reservado previamente por reserveStock(). Nunca falla.
     */
    private function releaseStock(?int $itemId, float $cantidad, ?int $ticketId, string $tipo = 'cancelacion'): void
    {
        if (!$itemId || $cantidad <= 0) return;

        $item = PosCatalogItem::where('id', $itemId)->lockForUpdate()->first();
        if (!$item || $item->tipo !== 'producto') return;

        $stockAntes = $item->stock;
        $item->increment('stock', $cantidad);

        PosStockMovement::create([
            'item_id' => $item->id,
            'ticket_id' => $ticketId,
            'tipo' => $tipo,
            'cantidad' => $cantidad,
            'stock_anterior' => $stockAntes,
            'stock_nuevo' => $stockAntes + $cantidad,
            'user_id' => auth()->id(),
            'created_at' => now(),
        ]);
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
