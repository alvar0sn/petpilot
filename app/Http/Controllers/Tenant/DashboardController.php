<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\Owner;
use App\Models\Pet;
use App\Models\PosTicket;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        if (auth()->user()->isSuperAdmin() && ! app()->bound('impersonating')) {
            return redirect()->route('super-admin.index');
        }

        $period = $request->get('period', 'month');

        [$from, $to] = match ($period) {
            'week' => [now()->startOfWeek(), now()->endOfWeek()],
            'quarter' => [now()->startOfQuarter(), now()->endOfQuarter()],
            'custom' => [
                Carbon::parse($request->from ?? now()->startOfMonth()),
                Carbon::parse($request->to ?? now()),
            ],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };

        // Métricas del período
        $eventosCount = Event::whereBetween('fecha', [$from, $to])->count();
        $esteticasCount = Event::whereBetween('fecha', [$from, $to])->whereHas('eventType', fn($q) => $q->where('nombre', 'Estética'))->count();
        $vacunasCount = Event::whereBetween('fecha', [$from, $to])->whereHas('eventType', fn($q) => $q->where('nombre', 'Vacuna'))->count();
        $consultasCount = Event::whereBetween('fecha', [$from, $to])->whereHas('eventType', fn($q) => $q->where('nombre', 'Consulta'))->count();
        $nuevasMascotas = Pet::whereBetween('created_at', [$from, $to])->count();
        $ticketsPagados = PosTicket::where('estado', 'pagado')->whereBetween('cobrado_at', [$from, $to])->sum('total');
        $creditosConsumidos = MembershipCreditMovement::where('tipo', 'consumo')->whereBetween('created_at', [$from, $to])->count();
        $recordatoriosEnviados = Event::whereBetween('updated_at', [$from, $to])->where('recordatorio_enviado', true)->count();

        // Alertas sin filtro de período
        $sinMascota = Owner::doesntHave('pets')->count();
        $recordatoriosVencidos = Event::whereNotNull('proximo_recordatorio')
            ->where('proximo_recordatorio', '<', today())
            ->where('recordatorio_enviado', false)
            ->count();
        $membresiasSaldoBajo = Membership::where('activa', true)
            ->whereHas('credits', fn($q) => $q->where('saldo_actual', '<=', 2))
            ->count();
        $membresiasVencenEstaSemana = Membership::where('activa', true)
            ->whereBetween('fecha_vencimiento', [today(), today()->addDays(7)])
            ->count();

        // Recordatorios programados para hoy
        $recordatoriosHoy = Event::with(['pet:id,nombre', 'pet.owner:id,nombre,apellidos,telefono', 'eventType:id,nombre'])
            ->whereDate('proximo_recordatorio', today())
            ->where('recordatorio_enviado', false)
            ->limit(10)
            ->get()
            ->map(fn($e) => [
                'pet' => $e->pet?->nombre,
                'owner' => $e->pet?->owner?->nombre_completo,
                'telefono' => $e->pet?->owner?->telefono,
                'tipo' => $e->eventType?->nombre,
            ]);

        return Inertia::render('Dashboard', [
            'period' => $period,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'metricas' => [
                'total_eventos' => $eventosCount,
                'esteticas' => $esteticasCount,
                'vacunas' => $vacunasCount,
                'consultas' => $consultasCount,
                'nuevas_mascotas' => $nuevasMascotas,
                'ingresos_pos' => $ticketsPagados,
                'creditos_consumidos' => $creditosConsumidos,
                'recordatorios_enviados' => $recordatoriosEnviados,
            ],
            'alertas' => [
                'sin_mascota' => $sinMascota,
                'recordatorios_vencidos' => $recordatoriosVencidos,
                'membresias_saldo_bajo' => $membresiasSaldoBajo,
                'membresias_vencen_semana' => $membresiasVencenEstaSemana,
            ],
            'recordatorios_hoy' => $recordatoriosHoy,
        ]);
    }
}
