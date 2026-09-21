<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CollectionBooking;
use App\Models\CollectionSlot;
use App\Services\CollectionBookingService;
use App\Services\PackageCreditService;
use App\Services\ResponsivaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CollectionBookingController extends Controller
{
    public function __construct(private readonly CollectionBookingService $collectionBookings)
    {
    }

    /**
     * Atajo desde otros módulos (grooming, hotel, etc.): reutiliza la ruta abierta del día
     * o crea una nueva, y agrega la mascota con el origen trazado.
     */
    public function quickRequest(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'owner_id' => 'required|exists:owners,id',
            'fecha' => 'required|date',
            'tipo_viaje' => 'required|in:recoleccion,entrega,ida_y_vuelta',
            'origen_tipo' => 'required|string|in:appointment,hotel_stay,walk_booking',
            'origen_id' => 'required|integer',
        ]);

        $result = $this->collectionBookings->createForOrigin($data);

        $slot = $result instanceof CollectionBooking ? $result->slot : CollectionSlot::whereDate('fecha', $data['fecha'])->latest('id')->first();

        return redirect()->route('collection.show', $slot)->with('success', 'Recolección solicitada.');
    }

    /**
     * Atajo desde el propio calendario de Recolección: agenda una mascota para una fecha
     * sin necesidad de crear la ruta primero — reutiliza o crea la ruta abierta del día.
     */
    public function quickAdd(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'owner_id' => 'required|exists:owners,id',
            'fecha' => 'required|date',
            'direccion' => 'nullable|string',
            'ubicacion_url' => 'nullable|string|max:2048',
            'rate_id' => 'nullable|exists:collection_rates,id',
            'tipo_viaje' => 'required|in:recoleccion,entrega,ida_y_vuelta',
            'cobro_membresia' => 'boolean',
            'membership_id' => 'nullable|exists:memberships,id',
            'usar_paquete' => 'boolean',
            'notas' => 'nullable|string|max:500',
        ]);
        $data['cobro_membresia'] = $request->boolean('cobro_membresia');

        $fecha = \Carbon\Carbon::parse($data['fecha'])->toDateString();
        unset($data['fecha']);

        $slot = DB::transaction(function () use ($data, $fecha) {
            $slot = $this->collectionBookings->findOrCreateOpenSlot($fecha);
            $result = $this->collectionBookings->addBookingToSlot($slot, $data);

            if ($result === 'duplicado') {
                throw ValidationException::withMessages(['pet_id' => 'Esta mascota ya está en la ruta de ese día.']);
            }
            if ($result === 'lleno') {
                throw ValidationException::withMessages(['pet_id' => 'La ruta de ese día está llena.']);
            }

            return $slot;
        });

        return redirect()->route('collection.show', $slot)->with('success', 'Recolección agendada.');
    }

    public function store(Request $request, CollectionSlot $collectionSlot): RedirectResponse
    {
        abort_unless($collectionSlot->estado === 'abierto', 422, 'Esta ruta no está abierta.');

        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'owner_id' => 'required|exists:owners,id',
            'direccion' => 'nullable|string',
            'ubicacion_url' => 'nullable|string|max:2048',
            'rate_id' => 'nullable|exists:collection_rates,id',
            'tipo_viaje' => 'required|in:recoleccion,entrega,ida_y_vuelta',
            'cobro_membresia' => 'boolean',
            'membership_id' => 'nullable|exists:memberships,id',
            'usar_paquete' => 'boolean',
            'origen_tipo' => 'nullable|string|in:appointment,hotel_stay',
            'origen_id' => 'nullable|integer',
            'notas' => 'nullable|string|max:500',
        ]);
        $data['cobro_membresia'] = $request->boolean('cobro_membresia');

        $result = DB::transaction(fn () => $this->collectionBookings->addBookingToSlot($collectionSlot, $data));

        if ($result === 'duplicado') {
            return back()->withErrors(['pet_id' => 'Esta mascota ya está en esta ruta.']);
        }
        if ($result === 'lleno') {
            return back()->withErrors(['pet_id' => 'La ruta está llena.']);
        }

        return back()->with('success', 'Mascota agregada a la ruta.');
    }

    public function updateEstado(Request $request, CollectionBooking $collectionBooking): RedirectResponse
    {
        $data = $request->validate([
            'estado' => 'required|in:en_ruta,completado',
        ]);

        abort_unless(
            in_array($collectionBooking->estado, ['programado', 'en_ruta']),
            422,
            'No se puede actualizar esta reserva.'
        );

        $collectionBooking->update($data);

        return back()->with('success', 'Estado actualizado.');
    }

    public function cancel(CollectionBooking $collectionBooking): RedirectResponse
    {
        abort_unless(in_array($collectionBooking->estado, ['programado', 'en_ruta']), 422, 'No se puede cancelar.');

        DB::transaction(function () use ($collectionBooking) {
            $collectionBooking->update(['estado' => 'cancelado']);

            if ($collectionBooking->package_credit_id) {
                PackageCreditService::restore(
                    $collectionBooking->packageCredit,
                    1,
                    'collection_booking',
                    $collectionBooking->id,
                    "Recolección cancelada — {$collectionBooking->pet?->nombre}"
                );
            }
        });

        return back()->with('success', 'Recolección cancelada.');
    }

    public function noShow(Request $request, CollectionBooking $collectionBooking): RedirectResponse
    {
        abort_unless(in_array($collectionBooking->estado, ['programado', 'en_ruta']), 422, 'No se puede marcar como no show.');

        $data = $request->validate([
            'notas' => 'nullable|string|max:500',
        ]);

        DB::transaction(fn () => $this->collectionBookings->markNoShow($collectionBooking, $data['notas'] ?? null));

        return back()->with('success', 'Recolección marcada como no show.');
    }

    public function sendResponsiva(CollectionBooking $collectionBooking): RedirectResponse
    {
        if ($collectionBooking->responsiva_firmado_at) {
            return back()->with('error', 'Esta responsiva ya fue firmada.');
        }

        $url = ResponsivaService::send($collectionBooking, 'recoleccion');

        return back()->with(['success' => "Responsiva enviada. Link: {$url}", 'responsiva_url' => $url]);
    }

    public function downloadResponsiva(CollectionBooking $collectionBooking): \Symfony\Component\HttpFoundation\Response
    {
        return ResponsivaService::download($collectionBooking);
    }
}
