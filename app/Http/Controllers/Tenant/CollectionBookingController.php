<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CollectionBooking;
use App\Models\CollectionSlot;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\Owner;
use App\Services\PackageCreditService;
use App\Services\ResponsivaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            'origen_tipo' => 'required|string|in:appointment,hotel_stay,walk_booking',
            'origen_id' => 'required|integer',
        ]);

        // Normaliza a 'Y-m-d': el origen puede mandar la fecha como string plano
        // o como datetime serializado (ej. modelos Eloquent con cast 'date').
        $fecha = \Carbon\Carbon::parse($data['fecha'])->toDateString();

        $slot = DB::transaction(function () use ($data, $fecha) {
            $slot = $this->findOrCreateOpenSlot($fecha);
            $this->addBookingToSlot($slot, $data);
            return $slot;
        });

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
            'notas' => 'nullable|string|max:500',
        ]);
        $data['cobro_membresia'] = $request->boolean('cobro_membresia');

        $fecha = \Carbon\Carbon::parse($data['fecha'])->toDateString();
        unset($data['fecha']);

        $slot = DB::transaction(function () use ($data, $fecha) {
            $slot = $this->findOrCreateOpenSlot($fecha);
            $result = $this->addBookingToSlot($slot, $data);

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
            'origen_tipo' => 'nullable|string|in:appointment,hotel_stay',
            'origen_id' => 'nullable|integer',
            'notas' => 'nullable|string|max:500',
        ]);
        $data['cobro_membresia'] = $request->boolean('cobro_membresia');

        $result = DB::transaction(fn () => $this->addBookingToSlot($collectionSlot, $data));

        if ($result === 'duplicado') {
            return back()->withErrors(['pet_id' => 'Esta mascota ya está en esta ruta.']);
        }
        if ($result === 'lleno') {
            return back()->withErrors(['pet_id' => 'La ruta está llena.']);
        }

        return back()->with('success', 'Mascota agregada a la ruta.');
    }

    private function findOrCreateOpenSlot(string $fecha): CollectionSlot
    {
        return CollectionSlot::whereDate('fecha', $fecha)
            ->where('estado', 'abierto')
            ->whereNull('recolector_id')
            ->first() ?? CollectionSlot::create([
                'fecha' => $fecha,
                'estado' => 'abierto',
                'created_by' => auth()->id(),
            ]);
    }

    /** @return CollectionBooking|'duplicado'|'lleno' */
    private function addBookingToSlot(CollectionSlot $collectionSlot, array $data): CollectionBooking|string
    {
        $tipoViaje = $data['tipo_viaje'] ?? 'recoleccion';

        if ($collectionSlot->bookings()->where('pet_id', $data['pet_id'])->where('tipo_viaje', $tipoViaje)
            ->whereIn('estado', ['programado', 'en_ruta'])->exists()) {
            return 'duplicado';
        }

        if ($collectionSlot->cupo_maximo && !$collectionSlot->tieneEspacio()) {
            return 'lleno';
        }

        // Mismo domicilio: si el dueño ya tiene otra mascota en esta ruta, reutilizamos su
        // dirección/tarifa para no volver a capturarla — la parada es la misma.
        if (empty($data['direccion']) || empty($data['ubicacion_url'])) {
            $existing = $collectionSlot->bookings()->where('owner_id', $data['owner_id'])
                ->whereIn('estado', ['programado', 'en_ruta', 'completado'])->first();

            $owner = $existing ?: Owner::find($data['owner_id']);
            $data['direccion'] = $data['direccion'] ?? ($existing->direccion ?? $owner?->direccion);
            $data['ubicacion_url'] = $data['ubicacion_url'] ?? ($existing->ubicacion_url ?? $owner?->ubicacion_url);
            $data['rate_id'] = $data['rate_id'] ?? $existing?->rate_id;
        }

        $booking = CollectionBooking::create([
            ...$data,
            'tipo_viaje' => $tipoViaje,
            'slot_id' => $collectionSlot->id,
            'estado' => 'programado',
            'created_by' => auth()->id(),
        ]);

        $this->processPayment($booking);

        return $booking;
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

    private function processPayment(CollectionBooking $booking): void
    {
        if ($booking->cobro_membresia && $booking->membership_id) {
            $membership = Membership::with('credits')->find($booking->membership_id);
            $credit = $membership?->getCredit('recoleccion');

            if ($credit && $credit->saldo_actual > 0) {
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

                return;
            }
        }

        // Sin membresía (o sin saldo) — ¿tiene crédito de paquete para esta tarifa exacta?
        if (! $booking->rate_id) {
            return;
        }

        $booking->loadMissing('rate');
        if (! $booking->rate?->pos_item_id) {
            return;
        }

        $credit = PackageCreditService::findCredit($booking->pet_id, $booking->rate->pos_item_id);
        if (! $credit) {
            return;
        }

        PackageCreditService::consume($credit, 1, 'collection_booking', $booking->id, "Recolección — {$booking->pet?->nombre} (ruta #{$booking->slot_id})");
        $booking->update(['package_credit_id' => $credit->id]);
    }
}
