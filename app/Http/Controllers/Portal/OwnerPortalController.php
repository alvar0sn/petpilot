<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\HotelStay;
use App\Models\Membership;
use App\Models\Pet;
use App\Models\Tenant;
use App\Models\WalkBooking;
use App\Models\WalkSlot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerPortalController extends Controller
{
    private function tenantArr(Tenant $tenant): array
    {
        return ['nombre' => $tenant->nombre, 'slug' => $tenant->slug];
    }

    private function ownerArr($owner): array
    {
        return [
            'id' => $owner->id,
            'nombre' => $owner->nombre,
            'apellidos' => $owner->apellidos,
            'nombre_completo' => $owner->nombre_completo,
        ];
    }

    public function home(Request $request, Tenant $tenant): Response
    {
        $owner = auth('owner')->user();
        $owner->load(['pets' => fn($q) => $q->orderBy('nombre')]);
        $petIds = $owner->pets->pluck('id');

        $pets = $owner->pets->map(fn(Pet $p) => [
            'id'   => $p->id,
            'nombre' => $p->nombre,
            'tipo' => $p->tipo,
            'raza' => $p->raza,
            'foto_url' => $p->foto_url,
            'estado' => $p->estado,
            'recordatorio_vacuna'   => $p->recordatorio_vacuna?->toDateString(),
            'recordatorio_despa'    => $p->recordatorio_despa?->toDateString(),
            'recordatorio_consulta' => $p->recordatorio_consulta?->toDateString(),
            'recordatorio_estetica' => $p->recordatorio_estetica?->toDateString(),
        ]);

        // Upcoming appointments (grooming + vet) in the next 30 days
        $appointments = Appointment::with(['pet:id,nombre', 'tipoServicio:id,nombre'])
            ->whereIn('pet_id', $petIds)
            ->whereIn('estado', ['pendiente', 'confirmada'])
            ->whereDate('fecha', '>=', now()->toDateString())
            ->whereDate('fecha', '<=', now()->addDays(30)->toDateString())
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'modulo' => $a->modulo,
                'fecha' => $a->fecha?->toDateString(),
                'hora_inicio' => $a->hora_inicio,
                'estado' => $a->estado,
                'pet' => $a->pet?->nombre,
                'tipo_servicio' => $a->tipoServicio?->nombre,
            ]);

        // Upcoming walk bookings
        $walkBookings = WalkBooking::with(['slot:id,fecha,hora_inicio', 'pet:id,nombre'])
            ->where('owner_id', $owner->id)
            ->whereIn('estado', ['solicitado', 'aprobado'])
            ->whereHas('slot', fn($q) => $q->whereDate('fecha', '>=', now()->toDateString()))
            ->get()
            ->sortBy(fn($b) => $b->slot?->fecha?->toDateString())
            ->take(10)
            ->values()
            ->map(fn($b) => [
                'fecha' => $b->slot?->fecha?->toDateString(),
                'hora_inicio' => $b->slot?->hora_inicio,
                'estado' => $b->estado,
                'pet' => $b->pet?->nombre,
            ]);

        return Inertia::render('Portal/Home', [
            'tenant' => $this->tenantArr($tenant),
            'owner'  => $this->ownerArr($owner),
            'pets'   => $pets,
            'appointments' => $appointments,
            'walkBookings' => $walkBookings,
        ]);
    }

    public function petHistory(Request $request, Tenant $tenant, Pet $pet): Response
    {
        $owner = auth('owner')->user();
        abort_unless((int) $pet->owner_id === (int) $owner->id, 403);

        $pet->load([
            'events' => fn($q) => $q->with('eventType:id,nombre')->latest('fecha')->limit(50),
        ]);

        $hotelStays = HotelStay::where('pet_id', $pet->id)
            ->whereNotIn('estado', ['cancelado'])
            ->orderByDesc('fecha_entrada')
            ->limit(50)
            ->get();

        $walkBookings = WalkBooking::where('pet_id', $pet->id)
            ->whereNotIn('estado', ['cancelado'])
            ->with('slot:id,fecha,hora_inicio')
            ->get()
            ->sortByDesc(fn($b) => $b->slot?->fecha?->toDateString())
            ->take(50)
            ->values();

        $activeMembership = Membership::with(['plan:id,nombre', 'credits'])
            ->where('pet_id', $pet->id)
            ->where('activa', true)
            ->latest('fecha_inicio')
            ->first();

        return Inertia::render('Portal/PetHistory', [
            'tenant' => $this->tenantArr($tenant),
            'owner'  => $this->ownerArr($owner),
            'pet' => [
                'id'   => $pet->id,
                'nombre' => $pet->nombre,
                'tipo' => $pet->tipo,
                'raza' => $pet->raza,
                'tamanio' => $pet->tamanio,
                'sexo' => $pet->sexo,
                'esterilizado' => $pet->esterilizado,
                'peso' => $pet->peso,
                'nivel_agresividad' => $pet->nivel_agresividad,
                'estado' => $pet->estado,
                'foto_url' => $pet->foto_url,
                'alergias' => $pet->alergias,
                'padecimientos' => $pet->padecimientos,
                'obs_comportamiento' => $pet->obs_comportamiento,
                'num_expediente' => $pet->num_expediente,
                'fecha_nacimiento' => $pet->fecha_nacimiento?->toDateString(),
                'recordatorio_vacuna'   => $pet->recordatorio_vacuna?->toDateString(),
                'recordatorio_despa'    => $pet->recordatorio_despa?->toDateString(),
                'recordatorio_consulta' => $pet->recordatorio_consulta?->toDateString(),
                'recordatorio_estetica' => $pet->recordatorio_estetica?->toDateString(),
                'events' => $pet->events->map(fn($e) => [
                    'id' => $e->id,
                    'fecha' => $e->fecha?->toDateString(),
                    'peso' => $e->peso,
                    'notas' => $e->notas,
                    'event_type' => $e->eventType
                        ? ['id' => $e->eventType->id, 'nombre' => $e->eventType->nombre]
                        : null,
                    'vacuna_nombre' => $e->vacuna_nombre,
                    'vacuna_lote' => $e->vacuna_lote,
                    'vacuna_laboratorio' => $e->vacuna_laboratorio,
                    'despa_producto' => $e->despa_producto,
                    'despa_via' => $e->despa_via,
                    'consulta_motivo' => $e->consulta_motivo,
                    'consulta_diagnostico' => $e->consulta_diagnostico,
                    'proximo_recordatorio' => $e->proximo_recordatorio?->toDateString(),
                    'appointment_id' => $e->appointment_id,
                ]),
            ],
            'hotelStays' => $hotelStays->map(fn($s) => [
                'id' => $s->id,
                'tipo' => $s->tipo,
                'estado' => $s->estado,
                'fecha_entrada' => $s->fecha_entrada?->toDateString(),
                'fecha_salida' => $s->fecha_salida?->toDateString(),
                'notas' => $s->notas,
            ]),
            'walkBookings' => $walkBookings->map(fn($b) => [
                'id' => $b->id,
                'estado' => $b->estado,
                'notas' => $b->notas,
                'fecha' => $b->slot?->fecha?->toDateString(),
                'hora_inicio' => $b->slot?->hora_inicio,
            ]),
            'activeMembership' => $activeMembership ? [
                'plan' => $activeMembership->plan ? ['nombre' => $activeMembership->plan->nombre] : null,
                'fecha_vencimiento' => $activeMembership->fecha_vencimiento?->toDateString(),
                'credits' => $activeMembership->credits->map(fn($c) => [
                    'servicio_tipo' => $c->servicio_tipo,
                    'saldo_actual'  => $c->saldo_actual,
                    'saldo_inicial' => $c->saldo_inicial,
                ]),
            ] : null,
        ]);
    }

    public function memberships(Request $request, Tenant $tenant): Response
    {
        $owner = auth('owner')->user();
        $owner->load('pets:id,owner_id,nombre');
        $petIds = $owner->pets->pluck('id');

        $active = Membership::with(['plan', 'credits', 'pet:id,nombre'])
            ->whereIn('pet_id', $petIds)
            ->where('activa', true)
            ->orderBy('fecha_vencimiento')
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'pet_id' => $m->pet_id,
                'pet' => $m->pet?->nombre,
                'plan' => $m->plan?->nombre,
                'fecha_inicio' => $m->fecha_inicio?->toDateString(),
                'fecha_vencimiento' => $m->fecha_vencimiento?->toDateString(),
                'dias_para_vencer' => $m->diasParaVencer(),
                'congelada' => $m->congelada,
                'credits' => $m->credits->map(fn($c) => [
                    'servicio_tipo' => $c->servicio_tipo,
                    'saldo_actual'  => $c->saldo_actual,
                    'saldo_inicial' => $c->saldo_inicial,
                ]),
            ]);

        $historical = Membership::with(['plan:id,nombre', 'pet:id,nombre'])
            ->whereIn('pet_id', $petIds)
            ->where('activa', false)
            ->orderByDesc('fecha_vencimiento')
            ->limit(10)
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'pet_id' => $m->pet_id,
                'pet' => $m->pet?->nombre,
                'plan' => $m->plan?->nombre,
                'fecha_inicio' => $m->fecha_inicio?->toDateString(),
                'fecha_vencimiento' => $m->fecha_vencimiento?->toDateString(),
            ]);

        return Inertia::render('Portal/Memberships', [
            'tenant' => $this->tenantArr($tenant),
            'owner'  => $this->ownerArr($owner),
            'pets'   => $owner->pets->map(fn($p) => ['id' => $p->id, 'nombre' => $p->nombre]),
            'active' => $active,
            'historical' => $historical,
        ]);
    }

    public function walks(Request $request, Tenant $tenant): Response
    {
        $owner = auth('owner')->user();

        // Walk config
        $horasAnticipacion = (int) ($tenant->getSetting('paseos.horas_anticipacion') ?? 2);
        $diasAdelante      = (int) ($tenant->getSetting('paseos.dias_adelante') ?? 14);

        // Week navigation
        $tz = $tenant->timezone ?? config('app.timezone');
        $nowTz = now($tz);
        $currentMonday = $nowTz->copy()->startOfWeek(\Carbon\Carbon::MONDAY)->toDateString();

        // Max visible date based on config
        $maxDate = $nowTz->copy()->addDays($diasAdelante)->toDateString();

        $weekStart = $request->query('week_start');
        if (! $weekStart || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStart)) {
            $weekStart = $currentMonday;
        }
        // Never allow navigating to past weeks or beyond max date
        if ($weekStart < $currentMonday) {
            $weekStart = $currentMonday;
        }
        $weekEnd = \Carbon\Carbon::parse($weekStart)->addDays(6)->toDateString();
        // Cap weekEnd at maxDate
        if ($weekEnd > $maxDate) {
            $weekEnd = $maxDate;
        }

        $today       = $nowTz->toDateString();
        $currentTime = $nowTz->format('H:i:s');
        // Minimum slot start time: now + horasAnticipacion
        $minSlotTime = $nowTz->copy()->addHours($horasAnticipacion)->format('H:i:s');
        $minSlotDate = $nowTz->copy()->addHours($horasAnticipacion)->toDateString();

        $slots = WalkSlot::with([
                'walker:id,nombre,apellido',
                'bookings' => fn($q) => $q->whereIn('estado', ['solicitado', 'aprobado']),
            ])
            ->where('estado', 'abierto')
            ->whereBetween('fecha', [$weekStart, $weekEnd])
            ->where(function ($q) use ($minSlotDate, $minSlotTime) {
                // Exclude slots within the advance-hours window
                $q->where('fecha', '>', $minSlotDate)
                  ->orWhere(function ($q2) use ($minSlotDate, $minSlotTime) {
                      $q2->where('fecha', $minSlotDate)
                         ->where(function ($q3) use ($minSlotTime) {
                             $q3->whereNull('hora_inicio')
                                ->orWhere('hora_inicio', '>', $minSlotTime);
                         });
                  });
            })
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn(WalkSlot $s) => [
                'id' => $s->id,
                'tipo' => $s->tipo,
                'fecha' => $s->fecha->toDateString(),
                'hora_inicio' => $s->hora_inicio,
                'hora_fin' => $s->hora_fin,
                'cupo_maximo' => $s->cupo_maximo,
                'cupos_disponibles' => $s->cuposDisponibles(),
                'walker' => $s->walker ? trim("{$s->walker->nombre} {$s->walker->apellido}") : null,
                'notas' => $s->notas,
                'mis_mascotas' => $owner->pets
                    ->pluck('id')
                    ->filter(fn($pid) => $s->bookings->where('pet_id', $pid)->whereIn('estado', ['solicitado', 'aprobado'])->isNotEmpty())
                    ->values(),
            ]);

        $ownerPetIds = $owner->pets->pluck('id');
        $memberships = \App\Models\Membership::with(['plan', 'credits'])
            ->whereIn('pet_id', $ownerPetIds)
            ->where('activa', true)
            ->whereDate('fecha_vencimiento', '>=', now()->toDateString())
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'plan' => $m->plan?->nombre,
                'fecha_inicio' => $m->fecha_inicio,
                'fecha_vencimiento' => $m->fecha_vencimiento,
                'credito_paseo' => $m->credits->where('servicio_tipo', 'paseo')->first()?->saldo_actual ?? 0,
            ])
            ->filter(fn($m) => $m['credito_paseo'] > 0)
            ->values();

        $pets = $owner->pets->map(fn($p) => [
            'id' => $p->id,
            'nombre' => $p->nombre,
        ]);

        return Inertia::render('Portal/Walks', [
            'tenant'          => $this->tenantArr($tenant),
            'owner'           => $this->ownerArr($owner),
            'slots'           => $slots,
            'pets'            => $pets,
            'memberships'     => $memberships,
            'week_start'      => $weekStart,
            'today'           => $today,
            'current_monday'  => $currentMonday,
            'max_date'        => $maxDate,
        ]);
    }

    public function requestBooking(Request $request, Tenant $tenant, WalkSlot $walkSlot): RedirectResponse
    {
        abort_unless($walkSlot->estado === 'abierto', 422, 'Este paseo no está disponible.');

        $owner = auth('owner')->user();

        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'cobro_membresia' => 'boolean',
            'membership_id' => 'nullable|exists:memberships,id',
            'notas' => 'nullable|string|max:500',
        ]);

        abort_unless($owner->pets->pluck('id')->contains($data['pet_id']), 403, 'Esta mascota no te pertenece.');

        if ($walkSlot->cupo_maximo && !$walkSlot->tieneEspacio()) {
            return back()->withErrors(['pet_id' => 'El paseo ya no tiene cupos disponibles.']);
        }

        if ($walkSlot->bookings()->where('pet_id', $data['pet_id'])->whereIn('estado', ['solicitado', 'aprobado'])->exists()) {
            return back()->withErrors(['pet_id' => 'Esta mascota ya tiene una solicitud para este paseo.']);
        }

        WalkBooking::create([
            ...$data,
            'slot_id' => $walkSlot->id,
            'owner_id' => $owner->id,
            'estado' => 'solicitado',
            'solicitud_owner' => true,
            'cobro_membresia' => $request->boolean('cobro_membresia'),
        ]);

        return back()->with('success', 'Solicitud enviada. La clínica la revisará y te confirmará.');
    }
}
