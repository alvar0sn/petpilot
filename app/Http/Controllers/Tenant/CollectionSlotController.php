<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CollectionRate;
use App\Models\CollectionSlot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CollectionSlotController extends Controller
{
    public function index(Request $request): Response
    {
        $weekStart = $request->filled('week_start')
            ? Carbon::parse($request->week_start)->startOfWeek(Carbon::MONDAY)
            : Carbon::today()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->addDays(6);

        $slots = CollectionSlot::with([
                'recolector:id,nombre,apellido',
                'bookings' => fn($q) => $q->with(['pet:id,nombre', 'owner:id,nombre,apellidos'])
                    ->whereIn('estado', ['programado', 'en_ruta', 'completado']),
            ])
            ->whereBetween('fecha', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->when($request->recolector_id, fn($q, $r) => $q->where('recolector_id', $r))
            ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn(CollectionSlot $s) => [
                'id' => $s->id,
                'fecha' => $s->fecha->toDateString(),
                'hora_inicio' => $s->hora_inicio,
                'hora_fin' => $s->hora_fin,
                'cupo_maximo' => $s->cupo_maximo,
                'cupos_ocupados' => $s->bookings->count(),
                'recolector' => $s->recolector ? trim("{$s->recolector->nombre} {$s->recolector->apellido}") : null,
                'estado' => $s->estado,
                'notas' => $s->notas,
                'paradas_count' => $s->bookings->groupBy('owner_id')->count(),
                'bookings' => $s->bookings->map(fn($b) => [
                    'id' => $b->id,
                    'pet' => $b->pet?->nombre,
                    'owner' => $b->owner ? trim("{$b->owner->nombre} {$b->owner->apellidos}") : null,
                    'owner_id' => $b->owner_id,
                    'estado' => $b->estado,
                    'tipo_viaje' => $b->tipo_viaje,
                    'cobro_membresia' => $b->cobro_membresia,
                ]),
            ]);

        $recolectores = User::where('tenant_id', auth()->user()->tenant_id)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido']);

        return Inertia::render('Collection/Index', [
            'slots' => $slots,
            'recolectores' => $recolectores,
            'filters' => ['week_start' => $weekStart->toDateString()] + $request->only('recolector_id', 'estado'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'fecha' => 'required|date',
            'hora_inicio' => 'nullable|date_format:H:i',
            'hora_fin' => 'nullable|date_format:H:i',
            'cupo_maximo' => 'nullable|integer|min:1|max:100',
            'recolector_id' => 'nullable|exists:users,id',
            'notas' => 'nullable|string|max:1000',
        ]);

        $slot = CollectionSlot::create([
            ...$data,
            'estado' => 'abierto',
            'created_by' => auth()->id(),
        ]);

        return redirect()->route('collection.show', $slot)->with('success', 'Ruta de recolección creada.');
    }

    public function show(CollectionSlot $collectionSlot): Response
    {
        $collectionSlot->load([
            'recolector:id,nombre,apellido',
            'createdBy:id,nombre,apellido',
            'bookings' => fn($q) => $q->whereIn('estado', ['programado', 'en_ruta', 'completado', 'cancelado']),
            'bookings.pet.owner:id,nombre,apellidos',
            'bookings.owner:id,nombre,apellidos,direccion,ubicacion_url',
            'bookings.rate',
            'bookings.membership.plan',
            'bookings.ticket',
            'bookings.createdBy:id,nombre,apellido',
        ]);

        $recolectores = User::where('tenant_id', auth()->user()->tenant_id)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido']);

        // Paradas: agrupar reservas activas por dueño para que el conductor vea un solo punto
        // aunque haya varias mascotas del mismo domicilio.
        $paradas = $collectionSlot->bookings
            ->whereIn('estado', ['programado', 'en_ruta', 'completado'])
            ->groupBy('owner_id')
            ->map(function ($bookings) {
                $first = $bookings->first();
                return [
                    'owner_id' => $first->owner_id,
                    'owner' => $first->owner ? trim("{$first->owner->nombre} {$first->owner->apellidos}") : null,
                    'direccion' => $first->direccion,
                    'ubicacion_url' => $first->ubicacion_url,
                    'bookings' => $bookings->values(),
                ];
            })
            ->values();

        return Inertia::render('Collection/Show', [
            'slot' => $collectionSlot,
            'recolectores' => $recolectores,
            'paradas' => $paradas,
            'rates' => CollectionRate::where('activa', true)->orderBy('cantidad')->get(['id', 'nombre', 'cantidad', 'precio']),
        ]);
    }

    public function update(Request $request, CollectionSlot $collectionSlot): RedirectResponse
    {
        $data = $request->validate([
            'fecha' => 'required|date',
            'hora_inicio' => 'nullable|date_format:H:i',
            'hora_fin' => 'nullable|date_format:H:i',
            'cupo_maximo' => 'nullable|integer|min:1|max:100',
            'recolector_id' => 'nullable|exists:users,id',
            'notas' => 'nullable|string|max:1000',
        ]);

        $collectionSlot->update($data);

        return back()->with('success', 'Ruta actualizada.');
    }

    public function cancel(CollectionSlot $collectionSlot): RedirectResponse
    {
        abort_unless(in_array($collectionSlot->estado, ['abierto', 'en_curso']), 422, 'No se puede cancelar esta ruta.');

        $collectionSlot->bookings()->whereIn('estado', ['programado', 'en_ruta'])->update(['estado' => 'cancelado']);
        $collectionSlot->update(['estado' => 'cancelado']);

        return back()->with('success', 'Ruta cancelada.');
    }

    public function complete(CollectionSlot $collectionSlot): RedirectResponse
    {
        abort_unless(in_array($collectionSlot->estado, ['abierto', 'en_curso']), 422, 'No se puede completar esta ruta.');

        $collectionSlot->update(['estado' => 'completado']);

        return back()->with('success', 'Ruta marcada como completada.');
    }
}
