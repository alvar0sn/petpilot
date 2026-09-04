<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CollectionBooking;
use App\Models\CollectionSlot;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollectionBookingController extends Controller
{
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
            'origen_tipo' => 'required|string|in:appointment,hotel_stay',
            'origen_id' => 'required|integer',
        ]);

        $slot = DB::transaction(function () use ($data) {
            $slot = CollectionSlot::whereDate('fecha', $data['fecha'])
                ->where('estado', 'abierto')
                ->whereNull('recolector_id')
                ->first();

            if (!$slot) {
                $slot = CollectionSlot::create([
                    'fecha' => $data['fecha'],
                    'estado' => 'abierto',
                    'created_by' => auth()->id(),
                ]);
            }

            $yaExiste = $slot->bookings()
                ->where('pet_id', $data['pet_id'])
                ->where('tipo_viaje', $data['tipo_viaje'])
                ->whereIn('estado', ['programado', 'en_ruta'])
                ->exists();

            if (!$yaExiste) {
                $owner = Owner::find($data['owner_id']);

                CollectionBooking::create([
                    'slot_id' => $slot->id,
                    'pet_id' => $data['pet_id'],
                    'owner_id' => $data['owner_id'],
                    'direccion' => $owner?->direccion,
                    'ubicacion_url' => $owner?->ubicacion_url,
                    'tipo_viaje' => $data['tipo_viaje'],
                    'estado' => 'programado',
                    'origen_tipo' => $data['origen_tipo'],
                    'origen_id' => $data['origen_id'],
                    'created_by' => auth()->id(),
                ]);
            }

            return $slot;
        });

        return redirect()->route('collection.show', $slot)->with('success', 'Recolección solicitada.');
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
            'origen_tipo' => 'nullable|string|in:appointment,hotel_stay',
            'origen_id' => 'nullable|integer',
            'notas' => 'nullable|string|max:500',
        ]);

        if ($collectionSlot->bookings()->where('pet_id', $data['pet_id'])->where('tipo_viaje', $data['tipo_viaje'])
            ->whereIn('estado', ['programado', 'en_ruta'])->exists()) {
            return back()->withErrors(['pet_id' => 'Esta mascota ya está en esta ruta.']);
        }

        if ($collectionSlot->cupo_maximo && !$collectionSlot->tieneEspacio()) {
            return back()->withErrors(['pet_id' => 'La ruta está llena.']);
        }

        // Mismo domicilio: si el dueño ya tiene otra mascota en esta ruta, reutilizamos su
        // dirección/tarifa para no volver a capturarla — la parada es la misma.
        if (empty($data['direccion']) || empty($data['ubicacion_url'])) {
            $existing = $collectionSlot->bookings()->where('owner_id', $data['owner_id'])
                ->whereIn('estado', ['programado', 'en_ruta', 'completado'])->first();

            $owner = $existing ?: Owner::find($data['owner_id']);
            $data['direccion'] = $data['direccion'] ?: ($existing->direccion ?? $owner?->direccion);
            $data['ubicacion_url'] = $data['ubicacion_url'] ?: ($existing->ubicacion_url ?? $owner?->ubicacion_url);
            $data['rate_id'] = $data['rate_id'] ?? $existing?->rate_id;
        }

        $booking = DB::transaction(function () use ($collectionSlot, $data, $request) {
            $booking = CollectionBooking::create([
                ...$data,
                'slot_id' => $collectionSlot->id,
                'estado' => 'programado',
                'cobro_membresia' => $request->boolean('cobro_membresia'),
                'created_by' => auth()->id(),
            ]);

            $this->processPayment($booking);

            return $booking;
        });

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

        $collectionBooking->update(['estado' => 'cancelado']);

        return back()->with('success', 'Recolección cancelada.');
    }

    private function processPayment(CollectionBooking $booking): void
    {
        if (!$booking->cobro_membresia || !$booking->membership_id) {
            return;
        }

        $membership = Membership::with('credits')->find($booking->membership_id);
        $credit = $membership?->getCredit('recoleccion');

        if (!$credit || $credit->saldo_actual <= 0) {
            return;
        }

        $saldoAntes = $credit->saldo_actual;
        $saldoNuevo = $saldoAntes - 1;
        $credit->update(['saldo_actual' => $saldoNuevo]);

        MembershipCreditMovement::create([
            'membership_id' => $membership->id,
            'credit_id' => $credit->id,
            'servicio_tipo' => 'recoleccion',
            'tipo' => 'consumo',
            'cantidad' => -1,
            'saldo_antes' => $saldoAntes,
            'saldo_despues' => $saldoNuevo,
            'referencia_tipo' => 'collection',
            'referencia_id' => $booking->id,
            'user_id' => auth()->id(),
            'notas' => "Recolección — {$booking->pet?->nombre} (ruta #{$booking->slot_id})",
        ]);
    }
}
