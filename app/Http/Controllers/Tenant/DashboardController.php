<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\Owner;
use App\Models\Pet;
use App\Models\PosTicket;
use App\Models\ReminderSend;
use App\Services\GhlService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
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
        $membresiasSaldoBajo = Membership::where('activa', true)
            ->whereHas('credits', fn($q) => $q->where('saldo_actual', '<=', 2))
            ->count();
        $membresiasVencenEstaSemana = Membership::where('activa', true)
            ->whereBetween('fecha_vencimiento', [today(), today()->addDays(7)])
            ->count();

        // Recordatorios unificados ±7 días (eventos + campos del pet)
        $rangeStart = today()->subDays(7);
        $rangeEnd   = today()->addDays(7);

        $recEventos = Event::with(['pet:id,nombre', 'pet.owner:id,nombre,apellidos,telefono', 'eventType:id,nombre'])
            ->whereNotNull('proximo_recordatorio')
            ->whereBetween('proximo_recordatorio', [$rangeStart, $rangeEnd])
            ->get()
            ->map(fn($e) => [
                'source'   => 'event',
                'event_id' => $e->id,
                'fecha'    => is_string($e->proximo_recordatorio) ? $e->proximo_recordatorio : $e->proximo_recordatorio?->toDateString(),
                'pet'      => $e->pet?->nombre,
                'pet_id'   => $e->pet?->id,
                'owner'    => $e->pet?->owner?->nombre_completo,
                'owner_id' => $e->pet?->owner?->id,
                'telefono' => $e->pet?->owner?->telefono,
                'tipo'     => $e->eventType?->nombre,
                'enviado'  => (bool) $e->recordatorio_enviado,
            ])
            // ->map() sobre un Eloquent\Collection conserva esa clase aunque el
            // contenido ya sean arrays — Eloquent\Collection::merge() espera
            // modelos (llama getKey()), así que hay que bajarlo a Collection base.
            ->toBase();

        $camposRecordatorio = [
            'recordatorio_vacuna'   => 'Vacuna',
            'recordatorio_despa'    => 'Desparasitación',
            'recordatorio_consulta' => 'Consulta',
            'recordatorio_estetica' => 'Estética',
        ];

        // Los recordatorios que sólo viven en pets.recordatorio_* (sin evento
        // asociado) no tienen su propia bandera de "enviado" — se registra en
        // reminder_sends cuando se envían (automático o manual).
        $sentPetReminders = ReminderSend::where('tenant_id', currentTenantId())
            ->whereBetween('fecha', [$rangeStart, $rangeEnd])
            ->get()
            ->map(fn($r) => $r->pet_id . '|' . $r->tipo . '|' . $r->fecha->toDateString())
            ->flip();

        $recPets = Pet::with('owner:id,nombre,apellidos,telefono')
            ->where(fn($q) => $q
                ->whereBetween('recordatorio_vacuna',   [$rangeStart, $rangeEnd])
                ->orWhereBetween('recordatorio_despa',   [$rangeStart, $rangeEnd])
                ->orWhereBetween('recordatorio_consulta', [$rangeStart, $rangeEnd])
                ->orWhereBetween('recordatorio_estetica', [$rangeStart, $rangeEnd])
            )
            ->get()
            ->flatMap(function ($pet) use ($camposRecordatorio, $rangeStart, $rangeEnd, $sentPetReminders) {
                $items = [];
                foreach ($camposRecordatorio as $campo => $tipo) {
                    $fecha = $pet->$campo;
                    if ($fecha && $fecha->between($rangeStart, $rangeEnd)) {
                        $fechaStr = $fecha->toDateString();
                        $items[] = [
                            'source'   => 'pet',
                            'event_id' => null,
                            'fecha'    => $fechaStr,
                            'pet'      => $pet->nombre,
                            'pet_id'   => $pet->id,
                            'owner'    => $pet->owner?->nombre_completo,
                            'owner_id' => $pet->owner?->id,
                            'telefono' => $pet->owner?->telefono,
                            'tipo'     => $tipo,
                            'enviado'  => isset($sentPetReminders[$pet->id . '|' . $tipo . '|' . $fechaStr]),
                        ];
                    }
                }
                return $items;
            });

        // Un evento completado (p. ej. cita de estética) escribe la misma fecha en
        // events.proximo_recordatorio y en pets.recordatorio_*. Si ya hay un evento
        // para ese pet/tipo/fecha, se descarta la entrada equivalente de $recPets
        // para no mostrar el mismo recordatorio dos veces.
        $recPets = $recPets->reject(fn($item) => $recEventos->contains(fn($e) =>
            $e['pet_id'] === $item['pet_id']
            && $e['tipo'] === $item['tipo']
            && $e['fecha'] === $item['fecha']
        ));

        $recordatorios = $recEventos->merge($recPets)
            ->sortBy('fecha')
            ->values()
            ->all();

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
                'membresias_saldo_bajo' => $membresiasSaldoBajo,
                'membresias_vencen_semana' => $membresiasVencenEstaSemana,
            ],
            'recordatorios' => $recordatorios,
        ]);
    }

    public function sendRecordatorio(Request $request, GhlService $ghl): RedirectResponse
    {
        $data = $request->validate([
            'source'   => 'required|in:event,pet',
            'event_id' => 'nullable|integer',
            'pet_id'   => 'required|integer',
            'tipo'     => 'required|string',
            'fecha'    => 'required|date',
        ]);

        $tenant = currentTenant();
        $pet = Pet::with('owner')->findOrFail($data['pet_id']);
        $owner = $pet->owner;

        if (! $owner?->ghl_contact_id) {
            return back()->with('error', 'El dueño de esta mascota no tiene un contacto de GHL vinculado.');
        }

        $sent = $ghl->sendWebhook($tenant->id, 'recordatorios', [
            'tipo'            => 'recordatorio',
            'tipo_servicio'   => $data['tipo'],
            'ghl_contact_id'  => $owner->ghl_contact_id,
            'owner_nombre'    => $owner->nombre,
            'owner_apellidos' => $owner->apellidos,
            'owner_telefono'  => $owner->telefono,
            'owner_email'     => $owner->email,
            'negocio'         => $tenant->nombre,
            'pet_nombre'      => $pet->nombre,
            'pet_raza'        => $pet->raza,
            'fecha_servicio'  => $data['fecha'],
        ]);

        if (! $sent) {
            return back()->with('error', 'No se pudo enviar el recordatorio. Revisa la configuración de GHL del negocio.');
        }

        if ($data['source'] === 'event' && ! empty($data['event_id'])) {
            Event::withoutGlobalScopes()
                ->where('id', $data['event_id'])
                ->where('tenant_id', $tenant->id)
                ->update(['recordatorio_enviado' => true]);
        } else {
            ReminderSend::firstOrCreate([
                'tenant_id' => $tenant->id,
                'pet_id'    => $data['pet_id'],
                'tipo'      => $data['tipo'],
                'fecha'     => $data['fecha'],
            ], [
                'origen'  => 'manual',
                'user_id' => auth()->id(),
            ]);
        }

        return back()->with('success', 'Recordatorio enviado.');
    }
}
