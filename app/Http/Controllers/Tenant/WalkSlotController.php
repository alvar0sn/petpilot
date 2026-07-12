<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalkRecurrence;
use App\Models\WalkSlot;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WalkSlotController extends Controller
{
    public function index(Request $request): Response
    {
        $weekStart = $request->filled('week_start')
            ? Carbon::parse($request->week_start)->startOfWeek(Carbon::MONDAY)
            : Carbon::today()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->addDays(6);

        $slots = WalkSlot::with([
                'walker:id,nombre,apellido',
                'recurrence:id,recurrence_type,recurrence_days',
                'bookings' => fn($q) => $q->with('pet:id,nombre')->whereIn('estado', ['solicitado', 'aprobado']),
            ])
            ->whereBetween('fecha', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->when($request->tipo, fn($q, $t) => $q->where('tipo', $t))
            ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
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
                'cupos_ocupados' => $s->bookings->count(),
                'walker' => $s->walker ? trim("{$s->walker->nombre} {$s->walker->apellido}") : null,
                'estado' => $s->estado,
                'notas' => $s->notas,
                'recurrence_id' => $s->recurrence_id,
                'recurrence_label' => $s->recurrence?->pattern_label,
                'bookings' => $s->bookings->map(fn($b) => [
                    'id' => $b->id,
                    'pet' => $b->pet?->nombre,
                    'estado' => $b->estado,
                    'cobro_membresia' => $b->cobro_membresia,
                ]),
                'solicitudes_pendientes' => $s->bookings->where('estado', 'solicitado')->count(),
            ]);

        $walkers = User::where('tenant_id', auth()->user()->tenant_id)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido']);

        $pendingBookings = \App\Models\WalkBooking::with([
                'slot:id,fecha,hora_inicio,tipo',
                'pet:id,nombre',
                'owner:id,nombre,apellidos',
            ])
            ->where('estado', 'solicitado')
            ->where('solicitud_owner', true)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($b) => [
                'id'              => $b->id,
                'pet'             => $b->pet?->nombre,
                'owner'           => $b->owner ? trim("{$b->owner->nombre} {$b->owner->apellidos}") : null,
                'slot_id'         => $b->slot_id,
                'slot_fecha'      => $b->slot?->fecha?->toDateString(),
                'slot_hora'       => $b->slot?->hora_inicio,
                'slot_tipo'       => $b->slot?->tipo,
                'cobro_membresia' => $b->cobro_membresia,
                'notas'           => $b->notas,
            ]);

        return Inertia::render('Walks/Index', [
            'slots'            => $slots,
            'walkers'          => $walkers,
            'filters'          => ['week_start' => $weekStart->toDateString()] + $request->only('tipo', 'estado', 'tab'),
            'pending_bookings' => $pendingBookings,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'tipo' => 'required|in:grupal,privado',
            'fecha' => 'required_without:recurrent|date|nullable',
            'hora_inicio' => 'nullable|date_format:H:i',
            'hora_fin' => 'nullable|date_format:H:i',
            'cupo_maximo' => 'nullable|integer|min:1|max:100',
            'walker_id' => 'nullable|exists:users,id',
            'notas' => 'nullable|string|max:1000',
            // Recurrence
            'recurrent' => 'boolean',
            'recurrence_type' => 'required_if:recurrent,true|in:daily,weekly',
            'recurrence_days' => [Rule::requiredIf(fn () => $request->boolean('recurrent') && $request->recurrence_type === 'weekly'), 'array'],
            'recurrence_days.*' => 'integer|min:0|max:6',
            'fecha_inicio' => 'required_if:recurrent,true|date|nullable',
            'fecha_fin' => 'nullable|date|after:fecha_inicio',
            'weeks_ahead' => 'nullable|integer|min:1|max:52',
        ]);

        if ($request->boolean('recurrent')) {
            return $this->storeRecurrent($request, $data);
        }

        $slot = WalkSlot::create([
            'tipo' => $data['tipo'],
            'fecha' => $data['fecha'],
            'hora_inicio' => $data['hora_inicio'] ?? null,
            'hora_fin' => $data['hora_fin'] ?? null,
            'cupo_maximo' => $data['cupo_maximo'] ?? null,
            'walker_id' => $data['walker_id'] ?? null,
            'notas' => $data['notas'] ?? null,
            'estado' => 'abierto',
            'created_by' => auth()->id(),
        ]);

        return redirect()->route('walks.show', $slot)->with('success', 'Slot de paseo creado.');
    }

    private function storeRecurrent(Request $request, array $data): RedirectResponse
    {
        $fechaInicio = Carbon::parse($data['fecha_inicio']);
        $fechaFin = isset($data['fecha_fin']) && $data['fecha_fin']
            ? Carbon::parse($data['fecha_fin'])
            : $fechaInicio->copy()->addWeeks((int) ($data['weeks_ahead'] ?? 8));

        $recurrence = WalkRecurrence::create([
            'tipo' => $data['tipo'],
            'hora_inicio' => $data['hora_inicio'] ?? null,
            'hora_fin' => $data['hora_fin'] ?? null,
            'cupo_maximo' => $data['cupo_maximo'] ?? null,
            'walker_id' => $data['walker_id'] ?? null,
            'recurrence_type' => $data['recurrence_type'],
            'recurrence_days' => $data['recurrence_days'] ?? null,
            'fecha_inicio' => $fechaInicio->toDateString(),
            'fecha_fin' => $fechaFin->toDateString(),
            'notas' => $data['notas'] ?? null,
            'created_by' => auth()->id(),
        ]);

        $this->generateSlots($recurrence, $fechaInicio, $fechaFin);

        return redirect()->route('walks.index')->with('success', "Serie recurrente creada — {$recurrence->pattern_label}.");
    }

    public function show(WalkSlot $walkSlot): Response
    {
        $walkSlot->load([
            'walker:id,nombre,apellido',
            'createdBy:id,nombre,apellido',
            'recurrence',
            'bookings.pet.owner:id,nombre,apellidos',
            'bookings.membership.plan',
            'bookings.ticket',
            'bookings.createdBy:id,nombre,apellido',
        ]);

        $walkers = User::where('tenant_id', auth()->user()->tenant_id)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido']);

        $recurrenceMeta = null;
        if ($walkSlot->recurrence_id) {
            $recurrenceMeta = [
                'id' => $walkSlot->recurrence->id,
                'pattern_label' => $walkSlot->recurrence->pattern_label,
                'fecha_inicio' => $walkSlot->recurrence->fecha_inicio->toDateString(),
                'fecha_fin' => $walkSlot->recurrence->fecha_fin?->toDateString(),
                'total_slots' => $walkSlot->recurrence->slots()->count(),
                'last_slot_date' => $walkSlot->recurrence->slots()->max('fecha'),
            ];
        }

        return Inertia::render('Walks/Show', [
            'slot' => $walkSlot,
            'walkers' => $walkers,
            'recurrence' => $recurrenceMeta,
        ]);
    }

    public function update(Request $request, WalkSlot $walkSlot): RedirectResponse
    {
        $data = $request->validate([
            'fecha' => 'required|date',
            'hora_inicio' => 'nullable|date_format:H:i',
            'hora_fin' => 'nullable|date_format:H:i',
            'cupo_maximo' => 'nullable|integer|min:1|max:100',
            'walker_id' => 'nullable|exists:users,id',
            'notas' => 'nullable|string|max:1000',
        ]);

        $walkSlot->update($data);

        return back()->with('success', 'Slot actualizado.');
    }

    public function cancel(WalkSlot $walkSlot): RedirectResponse
    {
        abort_unless(in_array($walkSlot->estado, ['abierto', 'en_curso']), 422, 'No se puede cancelar este slot.');

        $walkSlot->bookings()->whereIn('estado', ['solicitado', 'aprobado'])->update(['estado' => 'cancelado']);
        $walkSlot->update(['estado' => 'cancelado']);

        return back()->with('success', 'Slot cancelado.');
    }

    public function complete(WalkSlot $walkSlot): RedirectResponse
    {
        abort_unless(in_array($walkSlot->estado, ['abierto', 'en_curso']), 422, 'No se puede completar este slot.');

        $walkSlot->update(['estado' => 'completado']);

        return back()->with('success', 'Paseo marcado como completado.');
    }

    /** Extend a recurrence series by N weeks from the last generated slot */
    public function extendRecurrence(Request $request, WalkRecurrence $walkRecurrence): RedirectResponse
    {
        $data = $request->validate([
            'weeks' => 'required|integer|min:1|max:52',
        ]);

        $lastDate = $walkRecurrence->slots()->max('fecha');
        $from = $lastDate
            ? Carbon::parse($lastDate)->addDay()
            : Carbon::parse($walkRecurrence->fecha_inicio);
        $to = $from->copy()->addWeeks($data['weeks']);

        // Update the stored end date if we're going further
        if (!$walkRecurrence->fecha_fin || $to->gt(Carbon::parse($walkRecurrence->fecha_fin))) {
            $walkRecurrence->update(['fecha_fin' => $to->toDateString()]);
        }

        $count = $this->generateSlots($walkRecurrence, $from, $to);

        return back()->with('success', "{$count} slot(s) generados hasta {$to->format('d/m/Y')}.");
    }

    private function generateSlots(WalkRecurrence $recurrence, Carbon $from, Carbon $to): int
    {
        $count = 0;
        $current = $from->copy()->startOfDay();
        $end = $to->copy()->startOfDay();

        while ($current->lte($end)) {
            $matches = match ($recurrence->recurrence_type) {
                'daily' => true,
                'weekly' => in_array($current->dayOfWeek, $recurrence->recurrence_days ?? []),
                default => false,
            };

            if ($matches) {
                WalkSlot::firstOrCreate(
                    ['recurrence_id' => $recurrence->id, 'fecha' => $current->toDateString()],
                    [
                        'tipo' => $recurrence->tipo,
                        'hora_inicio' => $recurrence->hora_inicio,
                        'hora_fin' => $recurrence->hora_fin,
                        'cupo_maximo' => $recurrence->cupo_maximo,
                        'walker_id' => $recurrence->walker_id,
                        'notas' => $recurrence->notas,
                        'estado' => 'abierto',
                        'created_by' => $recurrence->created_by,
                    ]
                );
                $count++;
            }

            $current->addDay();
        }

        return $count;
    }
}
