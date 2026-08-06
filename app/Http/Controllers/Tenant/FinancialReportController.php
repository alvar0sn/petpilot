<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\PosCashMovement;
use App\Models\PosCategory;
use App\Models\PosPayment;
use App\Models\PosPaymentMethod;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use App\Models\PosTicketRefund;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinancialReportController extends Controller
{
    public function index(Request $request): Response
    {
        $period = $request->get('period', 'week');
        [$from, $to] = $this->resolveRange($period, $request);

        $ticketsQuery = fn() => PosTicket::where('estado', 'pagado')->whereBetween('cobrado_at', [$from, $to]);

        $ventasBrutas = (float) $ticketsQuery()->sum('subtotal');
        $descuentos = (float) $ticketsQuery()->sum('discount_amount');
        $ventas = (float) $ticketsQuery()->sum('total'); // ya neto de descuento, bruto de reembolsos

        $reembolsos = PosTicketRefund::whereBetween('created_at', [$from, $to])
            ->with(['ticket:id,folio,owner_id', 'ticket.owner:id,nombre,apellidos', 'paymentMethod:id,nombre'])
            ->get();
        $reembolsosTotal = (float) $reembolsos->sum('monto');

        $movimientos = PosCashMovement::whereBetween('created_at', [$from, $to])->with('user:id,nombre,apellido')->get();
        $otrosIngresos = (float) $movimientos->where('tipo', 'deposito')->sum('monto');
        $egresosCaja = (float) $movimientos->where('tipo', 'salida')->sum('monto');
        $egresos = $egresosCaja + $reembolsosTotal;

        $balance = $ventas + $otrosIngresos - $egresos;

        $lines = PosTicketLine::whereHas('ticket', fn($q) => $q->where('estado', 'pagado')->whereBetween('cobrado_at', [$from, $to]))
            ->with('item.categoria')
            ->get();

        $porCategoria = $this->groupByCategory($lines, $ventasBrutas);

        $porMetodo = PosPayment::whereHas('ticket', fn($q) => $q->where('estado', 'pagado')->whereBetween('cobrado_at', [$from, $to]))
            ->join('pos_payment_methods', 'pos_payment_methods.id', '=', 'pos_payments.payment_method_id')
            ->selectRaw('pos_payment_methods.nombre as nombre, count(*) as cantidad, sum(pos_payments.monto) as total')
            ->groupBy('pos_payment_methods.nombre')
            ->orderByDesc('total')
            ->get();

        $ingresosDetalle = $porMetodo->map(fn($m) => [
            'label' => "Ventas por ticket ({$m->nombre})",
            'nota' => "{$m->cantidad} ticket" . ($m->cantidad != 1 ? 's' : '') . " · {$m->nombre}",
            'monto' => (float) $m->total,
        ])->concat(
            $movimientos->where('tipo', 'deposito')->map(fn($m) => [
                'label' => $m->comentario ?: 'Depósito',
                'nota' => $m->created_at->translatedFormat('d M') . ($m->user ? ' · ' . trim($m->user->nombre . ' ' . $m->user->apellido) : ''),
                'monto' => (float) $m->monto,
            ])
        )->values();

        $egresosDetalle = $movimientos->where('tipo', 'salida')->map(fn($m) => [
            'label' => $m->comentario ?: 'Salida',
            'nota' => $m->created_at->translatedFormat('d M') . ($m->user ? ' · ' . trim($m->user->nombre . ' ' . $m->user->apellido) : ''),
            'monto' => (float) $m->monto,
        ])->concat(
            $reembolsos->map(fn($r) => [
                'label' => 'Reembolso — ticket #' . $r->ticket?->folio,
                'nota' => $r->created_at->translatedFormat('d M') . ' · ' . ($r->paymentMethod?->nombre ?? '') . ($r->motivo ? " · {$r->motivo}" : ''),
                'monto' => (float) $r->monto,
            ])
        )->values();

        $turnosCount = PosShift::whereBetween('fecha_apertura', [$from, $to])->count();

        return Inertia::render('Reports/Financial', [
            'period' => $period,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'kpis' => [
                'ventas' => $ventas,
                'otros_ingresos' => $otrosIngresos,
                'egresos' => $egresos,
                'balance' => $balance,
            ],
            'porCategoria' => $porCategoria,
            'porMetodo' => $porMetodo->map(fn($m) => ['nombre' => $m->nombre, 'cantidad' => $m->cantidad, 'total' => (float) $m->total]),
            'caja' => [
                'ingresos_total' => (float) $ingresosDetalle->sum('monto'),
                'egresos_total' => (float) $egresosDetalle->sum('monto'),
                'ingresos' => $ingresosDetalle,
                'egresos' => $egresosDetalle,
            ],
            'turnosCount' => $turnosCount,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $period = $request->get('period', 'week');
        [$from, $to] = $this->resolveRange($period, $request);

        // Un solo día (ej. "Hoy"): detalle transacción por transacción, con el
        // cliente/concepto en la columna A. Más de un día: resumen diario
        // agregado por categoría, como ya se tenía.
        if ($from->isSameDay($to)) {
            return $this->exportTransactions($from, $to);
        }

        return $this->exportDaily($from, $to);
    }

    private function exportTransactions(Carbon $from, Carbon $to): StreamedResponse
    {
        $tickets = PosTicket::where('estado', 'pagado')
            ->whereBetween('cobrado_at', [$from, $to])
            ->with(['owner:id,nombre,apellidos', 'payments.paymentMethod:id,nombre'])
            ->get();

        $movimientos = PosCashMovement::whereBetween('created_at', [$from, $to])->get();
        $reembolsos = PosTicketRefund::whereBetween('created_at', [$from, $to])
            ->with(['ticket:id,folio,owner_id', 'ticket.owner:id,nombre,apellidos', 'paymentMethod:id,nombre'])
            ->get();

        $metodos = PosPaymentMethod::where('activo', true)->orderBy('orden')->pluck('nombre')->all();
        $vacioPorMetodo = array_fill_keys($metodos, 0.0);

        $rows = collect();

        foreach ($tickets as $t) {
            $porMetodo = $vacioPorMetodo;
            foreach ($t->payments as $pago) {
                $nombre = $pago->paymentMethod?->nombre;
                if ($nombre === null || !array_key_exists($nombre, $porMetodo)) continue;
                $porMetodo[$nombre] += (float) $pago->monto;
            }
            $rows->push([
                'hora' => $t->cobrado_at,
                'concepto' => $t->owner ? trim("{$t->owner->nombre} {$t->owner->apellidos}") : 'Sin cliente',
                'tipo' => 'Venta',
                'metodo' => $t->payments->pluck('paymentMethod.nombre')->filter()->unique()->implode(' + '),
                'folio' => $t->folio,
                'ingreso' => (float) $t->total,
                'egreso' => 0.0,
                'por_metodo' => $porMetodo,
            ]);
        }

        foreach ($movimientos->where('tipo', 'deposito') as $m) {
            $rows->push([
                'hora' => $m->created_at,
                'concepto' => $m->comentario ?: 'Depósito',
                'tipo' => 'Depósito',
                'metodo' => '',
                'folio' => '',
                'ingreso' => (float) $m->monto,
                'egreso' => 0.0,
                'por_metodo' => $vacioPorMetodo,
            ]);
        }

        foreach ($movimientos->where('tipo', 'salida') as $m) {
            $rows->push([
                'hora' => $m->created_at,
                'concepto' => $m->comentario ?: 'Salida',
                'tipo' => 'Salida',
                'metodo' => '',
                'folio' => '',
                'ingreso' => 0.0,
                'egreso' => (float) $m->monto,
                'por_metodo' => $vacioPorMetodo,
            ]);
        }

        foreach ($reembolsos as $r) {
            $nombreMetodo = $r->paymentMethod?->nombre;
            $porMetodo = $vacioPorMetodo;
            if ($nombreMetodo !== null && array_key_exists($nombreMetodo, $porMetodo)) {
                $porMetodo[$nombreMetodo] = (float) $r->monto;
            }
            $rows->push([
                'hora' => $r->created_at,
                'concepto' => 'Reembolso — ' . ($r->ticket?->owner ? trim("{$r->ticket->owner->nombre} {$r->ticket->owner->apellidos}") : 'Sin cliente'),
                'tipo' => 'Reembolso',
                'metodo' => $nombreMetodo ?? '',
                'folio' => $r->ticket?->folio ?? '',
                'ingreso' => 0.0,
                'egreso' => (float) $r->monto,
                'por_metodo' => $porMetodo,
            ]);
        }

        $rows = $rows->sortBy('hora')->values();

        $filename = "reporte-financiero-{$from->toDateString()}.csv";

        return response()->streamDownload(function () use ($rows, $metodos) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($out, array_merge(['Cliente o concepto', 'Tipo', 'Método', 'Folio', 'Hora', 'Ingreso', 'Egreso'], $metodos), ',', '"', '');

            foreach ($rows as $r) {
                $row = [
                    $r['concepto'],
                    $r['tipo'],
                    $r['metodo'],
                    $r['folio'],
                    $r['hora']->format('H:i'),
                    number_format($r['ingreso'], 2, '.', ''),
                    number_format($r['egreso'], 2, '.', ''),
                ];
                foreach ($metodos as $m) {
                    $row[] = number_format($r['por_metodo'][$m], 2, '.', '');
                }
                fputcsv($out, $row, ',', '"', '');
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function exportDaily(Carbon $from, Carbon $to): StreamedResponse
    {
        $tickets = PosTicket::where('estado', 'pagado')
            ->whereBetween('cobrado_at', [$from, $to])
            ->with('lines.item.categoria')
            ->get();

        $movimientos = PosCashMovement::whereBetween('created_at', [$from, $to])->get();
        $reembolsos = PosTicketRefund::whereBetween('created_at', [$from, $to])->get();

        // Todas las categorías activas del catálogo, siempre — así las columnas
        // del CSV son consistentes entre periodos distintos aunque una categoría
        // no haya tenido ventas ese rango (se reporta en 0, no se omite la columna).
        // Se agregan también categorías del período que ya no estén activas (por
        // si se desactivó una con ventas históricas) y 'Sin categoría' si aplica,
        // para no perder ninguna venta real del rango consultado.
        $categoriasActivas = PosCategory::where('activo', true)->orderBy('orden')->pluck('nombre')->all();
        $categoriasDelPeriodo = $tickets->flatMap(fn($t) => $t->lines)
            ->map(fn($l) => $l->item?->categoria?->nombre ?? 'Sin categoría')
            ->unique()
            ->values()
            ->all();

        $categorias = array_values(array_unique(array_merge($categoriasActivas, $categoriasDelPeriodo)));
        if (empty($categorias)) {
            $categorias = ['Sin categoría'];
        }

        // Métodos de pago activos del tenant (Efectivo, Tarjeta, Transferencia, etc.)
        // — columnas dinámicas al final con lo cobrado ese día por cada uno.
        $metodos = PosPaymentMethod::where('activo', true)->orderBy('orden')->pluck('nombre')->all();

        $pagos = PosPayment::whereIn('ticket_id', $tickets->pluck('id'))
            ->with('paymentMethod:id,nombre')
            ->get();

        $filename = "reporte-financiero-{$from->toDateString()}_a_{$to->toDateString()}.csv";

        return response()->streamDownload(function () use ($from, $to, $tickets, $movimientos, $reembolsos, $categorias, $metodos, $pagos) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($out, array_merge(['Día'], $categorias, ['Ventas', 'Otros ingresos', 'Egresos', 'Balance'], $metodos), ',', '"', '');

            foreach (CarbonPeriod::create($from->copy()->startOfDay(), $to->copy()->startOfDay()) as $day) {
                $dayTickets = $tickets->filter(fn($t) => $t->cobrado_at->isSameDay($day));
                $dayTicketIds = $dayTickets->pluck('id');

                $porCategoriaDia = array_fill_keys($categorias, 0.0);
                foreach ($dayTickets as $t) {
                    foreach ($t->lines as $line) {
                        $nombre = $line->item?->categoria?->nombre ?? 'Sin categoría';
                        if (!array_key_exists($nombre, $porCategoriaDia)) continue;
                        $porCategoriaDia[$nombre] += (float) $line->subtotal;
                    }
                }

                $porMetodoDia = array_fill_keys($metodos, 0.0);
                foreach ($pagos->whereIn('ticket_id', $dayTicketIds) as $pago) {
                    $nombre = $pago->paymentMethod?->nombre;
                    if ($nombre === null || !array_key_exists($nombre, $porMetodoDia)) continue;
                    $porMetodoDia[$nombre] += (float) $pago->monto;
                }

                $ventasDia = (float) $dayTickets->sum('total');
                $depositosDia = (float) $movimientos->where('tipo', 'deposito')->filter(fn($m) => $m->created_at->isSameDay($day))->sum('monto');
                $salidasDia = (float) $movimientos->where('tipo', 'salida')->filter(fn($m) => $m->created_at->isSameDay($day))->sum('monto');
                $reembolsosDia = (float) $reembolsos->filter(fn($r) => $r->created_at->isSameDay($day))->sum('monto');

                $egresosDia = $salidasDia + $reembolsosDia;
                $balanceDia = $ventasDia + $depositosDia - $egresosDia;

                $row = [$day->toDateString()];
                foreach ($categorias as $c) {
                    $row[] = number_format($porCategoriaDia[$c], 2, '.', '');
                }
                $row[] = number_format($ventasDia, 2, '.', '');
                $row[] = number_format($depositosDia, 2, '.', '');
                $row[] = number_format($egresosDia, 2, '.', '');
                $row[] = number_format($balanceDia, 2, '.', '');
                foreach ($metodos as $m) {
                    $row[] = number_format($porMetodoDia[$m], 2, '.', '');
                }

                fputcsv($out, $row, ',', '"', '');
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function resolveRange(string $period, Request $request): array
    {
        return match ($period) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'month' => [now()->startOfMonth(), now()->endOfMonth()],
            'custom' => [
                Carbon::parse($request->get('from') ?? now()->startOfWeek())->startOfDay(),
                Carbon::parse($request->get('to') ?? now())->endOfDay(),
            ],
            default => [now()->startOfWeek(), now()->endOfWeek()],
        };
    }

    /**
     * Agrupa líneas vendidas por categoría de catálogo, con desglose por
     * artículo/servicio dentro de cada una, para el drill-down del reporte.
     */
    private function groupByCategory($lines, float $ventasBrutas): array
    {
        $porCategoria = $lines->groupBy(fn($line) => $line->item?->categoria?->nombre ?? 'Sin categoría');

        $rows = $porCategoria->map(function ($group, $nombre) use ($ventasBrutas) {
            $total = (float) $group->sum('subtotal');
            $itemsAgrupados = $group->groupBy(fn($l) => $l->nombre_snapshot)->map(fn($g) => [
                'nombre' => $g->first()->nombre_snapshot,
                'cantidad' => (float) $g->sum('cantidad'),
                'total' => (float) $g->sum('subtotal'),
            ])->sortByDesc('total')->values()->all();

            return [
                'nombre' => $nombre,
                'cantidad' => (float) $group->sum('cantidad'),
                'total' => $total,
                'porcentaje' => $ventasBrutas > 0 ? round($total / $ventasBrutas * 100) : 0,
                'items' => $itemsAgrupados,
            ];
        })->values()->all();

        usort($rows, fn($a, $b) => $b['total'] <=> $a['total']);

        return $rows;
    }
}
