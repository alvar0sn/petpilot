<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\PosCashMovement;
use App\Models\PosPayment;
use App\Models\PosPaymentMethod;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use App\Models\PosTicketRefund;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosShiftController extends Controller
{
    public function index(): Response
    {
        $shifts = PosShift::with(['user:id,nombre,apellido', 'closedByUser:id,nombre,apellido'])
            ->latest('fecha_apertura')
            ->paginate(30)
            ->through(fn($s) => [
                'id' => $s->id,
                'fecha_apertura' => $s->fecha_apertura,
                'abierto_por' => trim(($s->user?->nombre ?? '') . ' ' . ($s->user?->apellido ?? '')),
                'fecha_cierre' => $s->fecha_cierre,
                'cerrado_por' => $s->closedByUser
                    ? trim($s->closedByUser->nombre . ' ' . $s->closedByUser->apellido)
                    : null,
                'fondo_inicial' => $s->fondo_inicial,
                'estado' => $s->estado,
            ]);

        return Inertia::render('Pos/Shift', [
            'shifts' => $shifts,
            'hayTurnoAbierto' => PosShift::where('estado', 'abierto')->exists(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (PosShift::where('estado', 'abierto')->exists()) {
            return back()->withErrors(['error' => 'Ya hay un turno abierto.']);
        }

        $data = $request->validate([
            'fondo_inicial' => 'required|numeric|min:0',
        ]);

        $shift = PosShift::create([
            'user_id' => auth()->id(),
            'fecha_apertura' => now(),
            'fondo_inicial' => $data['fondo_inicial'],
            'estado' => 'abierto',
        ]);

        return redirect()->route('pos.shift.show', $shift)->with('success', 'Turno abierto.');
    }

    public function close(Request $request, PosShift $shift): RedirectResponse
    {
        if (! $shift->isOpen()) {
            return back()->withErrors(['error' => 'El turno ya está cerrado.']);
        }

        $data = $request->validate([
            'efectivo_contado' => 'required|numeric|min:0',
        ]);

        $shift->update([
            'efectivo_contado' => $data['efectivo_contado'],
            'fecha_cierre' => now(),
            'closed_by_user_id' => auth()->id(),
            'estado' => 'cerrado',
        ]);

        return redirect()->route('pos.shift.show', $shift)->with('success', 'Turno cerrado.');
    }

    public function addMovement(Request $request, PosShift $shift): RedirectResponse
    {
        $data = $request->validate([
            'tipo' => 'required|in:deposito,salida',
            'monto' => 'required|numeric|min:0.01',
            'comentario' => 'nullable|string|max:200',
        ]);

        PosCashMovement::create([
            'shift_id' => $shift->id,
            'user_id' => auth()->id(),
            'tipo' => $data['tipo'],
            'monto' => $data['monto'],
            'comentario' => $data['comentario'],
        ]);

        return back()->with('success', 'Movimiento registrado.');
    }

    public function show(PosShift $shift): Response
    {
        $shift->load(['user:id,nombre,apellido', 'closedByUser:id,nombre,apellido', 'cashMovements.user:id,nombre,apellido']);

        $ticketsQuery = fn() => PosTicket::where('shift_close_id', $shift->id)->where('estado', 'pagado');

        $efectivoIds = PosPaymentMethod::get()
            ->filter(fn($m) => strtolower(trim($m->nombre)) === 'efectivo')
            ->pluck('id');

        $depositos = $shift->cashMovements->where('tipo', 'deposito')->sum('monto');
        $salidas = $shift->cashMovements->where('tipo', 'salida')->sum('monto');

        $cobrosEfectivo = (float) PosPayment::whereIn('payment_method_id', $efectivoIds)
            ->whereHas('ticket', fn($q) => $q->where('shift_close_id', $shift->id)->where('estado', 'pagado'))
            ->sum('monto');

        $reembolsosTotal = (float) PosTicketRefund::where('shift_id', $shift->id)->sum('monto');
        $reembolsosEfectivo = (float) PosTicketRefund::where('shift_id', $shift->id)
            ->whereIn('payment_method_id', $efectivoIds)
            ->sum('monto');

        $efectivoTeorico = (float) $shift->fondo_inicial + $cobrosEfectivo - $reembolsosEfectivo + (float) $depositos - (float) $salidas;
        $diferencia = $shift->estado === 'cerrado'
            ? (float) $shift->efectivo_contado - $efectivoTeorico
            : null;

        $ventasBrutas = (float) $ticketsQuery()->sum('subtotal');
        $descuentos = (float) $ticketsQuery()->sum('discount_amount');
        $ventasNetas = $ventasBrutas - $reembolsosTotal - $descuentos;

        $porMetodo = PosPayment::whereHas('ticket', fn($q) => $q->where('shift_close_id', $shift->id)->where('estado', 'pagado'))
            ->join('pos_payment_methods', 'pos_payment_methods.id', '=', 'pos_payments.payment_method_id')
            ->selectRaw('pos_payment_methods.nombre as nombre, count(*) as cantidad, sum(pos_payments.monto) as total')
            ->groupBy('pos_payment_methods.nombre')
            ->orderByDesc('total')
            ->get();

        $lines = PosTicketLine::whereHas('ticket', fn($q) => $q->where('shift_close_id', $shift->id)->where('estado', 'pagado'))
            ->with('item.categoria')
            ->get();

        $ventasPorLinea = $this->groupLines($lines);

        $refunds = PosTicketRefund::where('shift_id', $shift->id)
            ->with(['ticket:id,folio,owner_id', 'ticket.owner:id,nombre,apellidos', 'user:id,nombre,apellido', 'paymentMethod:id,nombre'])
            ->latest('created_at')
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'folio' => $r->ticket?->folio,
                'cliente' => $r->ticket?->owner
                    ? trim("{$r->ticket->owner->nombre} {$r->ticket->owner->apellidos}")
                    : 'Sin cliente',
                'motivo' => $r->motivo,
                'metodo' => $r->paymentMethod?->nombre,
                'monto' => $r->monto,
                'created_at' => $r->created_at,
            ]);

        $tickets = $ticketsQuery()
            ->with(['owner:id,nombre,apellidos', 'payments.paymentMethod:id,nombre'])
            ->orderBy('cobrado_at')
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'folio' => $t->folio,
                'token' => $t->token,
                'cliente' => $t->owner ? trim("{$t->owner->nombre} {$t->owner->apellidos}") : 'Sin cliente',
                'metodo' => $t->payments->pluck('paymentMethod.nombre')->filter()->unique()->implode(' + '),
                'descuento' => $t->discount_amount,
                'total' => $t->total,
                'cobrado_at' => $t->cobrado_at,
            ]);

        return Inertia::render('Pos/ShiftDetail', [
            'shift' => [
                'id' => $shift->id,
                'estado' => $shift->estado,
                'fecha_apertura' => $shift->fecha_apertura,
                'fecha_cierre' => $shift->fecha_cierre,
                'abierto_por' => trim(($shift->user?->nombre ?? '') . ' ' . ($shift->user?->apellido ?? '')),
                'cerrado_por' => $shift->closedByUser
                    ? trim($shift->closedByUser->nombre . ' ' . $shift->closedByUser->apellido)
                    : null,
                'fondo_inicial' => $shift->fondo_inicial,
                'efectivo_contado' => $shift->efectivo_contado,
                'cashMovements' => $shift->cashMovements->map(fn($m) => [
                    'id' => $m->id,
                    'tipo' => $m->tipo,
                    'monto' => $m->monto,
                    'comentario' => $m->comentario,
                    'user' => trim(($m->user?->nombre ?? '') . ' ' . ($m->user?->apellido ?? '')),
                    'created_at' => $m->created_at,
                ]),
            ],
            'efectivo' => [
                'fondo_inicial' => (float) $shift->fondo_inicial,
                'cobros_efectivo' => $cobrosEfectivo,
                'reembolsos_efectivo' => $reembolsosEfectivo,
                'depositos' => (float) $depositos,
                'salidas' => (float) $salidas,
                'efectivo_teorico' => $efectivoTeorico,
                'efectivo_contado' => $shift->efectivo_contado !== null ? (float) $shift->efectivo_contado : null,
                'diferencia' => $diferencia,
            ],
            'ventas' => [
                'brutas' => $ventasBrutas,
                'reembolsos' => $reembolsosTotal,
                'descuentos' => $descuentos,
                'netas' => $ventasNetas,
                'por_metodo' => $porMetodo,
            ],
            'articulos' => $ventasPorLinea['articulos'],
            'membresias' => $ventasPorLinea['membresias'],
            'servicios' => $ventasPorLinea['servicios'],
            'otros' => $ventasPorLinea['otros'],
            'reembolsos' => $refunds,
            'tickets' => $tickets,
            'paymentMethods' => PosPaymentMethod::where('activo', true)->orderBy('orden')->get(['id', 'nombre']),
        ]);
    }

    /**
     * Agrupa líneas de ticket vendidas en el turno por tipo de artículo:
     * productos, membresías (categoría 'Membresías'), otros servicios,
     * y líneas cuyo item de catálogo fue borrado (sin item_id).
     */
    private function groupLines($lines): array
    {
        $buckets = ['articulos' => [], 'membresias' => [], 'servicios' => [], 'otros' => []];

        $grouped = $lines->groupBy(function ($line) {
            $item = $line->item;
            $bucket = match (true) {
                ! $item => 'otros',
                $item->tipo === 'producto' => 'articulos',
                $item->categoria?->nombre === 'Membresías' => 'membresias',
                default => 'servicios',
            };

            return $bucket . '|' . $line->nombre_snapshot;
        });

        foreach ($grouped as $key => $group) {
            [$bucket] = explode('|', $key, 2);
            $buckets[$bucket][] = [
                'nombre' => $group->first()->nombre_snapshot,
                'cantidad' => (float) $group->sum('cantidad'),
                'total' => (float) $group->sum('subtotal'),
            ];
        }

        foreach ($buckets as $b => $rows) {
            usort($buckets[$b], fn($a, $c) => $c['total'] <=> $a['total']);
        }

        return $buckets;
    }
}
