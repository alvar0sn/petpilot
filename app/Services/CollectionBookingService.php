<?php

namespace App\Services;

use App\Models\CollectionBooking;
use App\Models\CollectionSlot;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\Owner;
use Illuminate\Support\Facades\DB;

/**
 * Crea reservas de recolección desde otros módulos (grooming, hotel, paseos, etc.)
 * al momento de agendar el servicio de origen, con la tarifa ya asociada —
 * misma lógica que CollectionBookingController::quickAdd/store, extraída para
 * reutilizarse fuera del módulo de Recolección.
 */
class CollectionBookingService
{
    /** @return CollectionBooking|'duplicado'|'lleno' */
    public function createForOrigin(array $data): CollectionBooking|string
    {
        return DB::transaction(function () use ($data) {
            $slot = $this->findOrCreateOpenSlot($data['fecha']);
            unset($data['fecha']);

            return $this->addBookingToSlot($slot, $data);
        });
    }

    public function findOrCreateOpenSlot(string $fecha): CollectionSlot
    {
        $fecha = \Carbon\Carbon::parse($fecha)->toDateString();

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
    public function addBookingToSlot(CollectionSlot $collectionSlot, array $data): CollectionBooking|string
    {
        $tipoViaje = $data['tipo_viaje'] ?? 'recoleccion';

        if ($collectionSlot->bookings()->where('pet_id', $data['pet_id'])->where('tipo_viaje', $tipoViaje)
            ->whereIn('estado', ['programado', 'en_ruta'])->exists()) {
            return 'duplicado';
        }

        if ($collectionSlot->cupo_maximo && !$collectionSlot->tieneEspacio()) {
            return 'lleno';
        }

        if (empty($data['direccion']) || empty($data['ubicacion_url'])) {
            $existing = $collectionSlot->bookings()->where('owner_id', $data['owner_id'])
                ->whereIn('estado', ['programado', 'en_ruta', 'completado'])->first();

            $owner = $existing ?: Owner::find($data['owner_id']);
            $data['direccion'] = $data['direccion'] ?? ($existing->direccion ?? $owner?->direccion);
            $data['ubicacion_url'] = $data['ubicacion_url'] ?? ($existing->ubicacion_url ?? $owner?->ubicacion_url);
            $data['rate_id'] = $data['rate_id'] ?? $existing?->rate_id;
        }

        $usarPaquete = $data['usar_paquete'] ?? true;
        unset($data['usar_paquete']);

        $booking = CollectionBooking::create([
            ...$data,
            'tipo_viaje' => $tipoViaje,
            'slot_id' => $collectionSlot->id,
            'estado' => 'programado',
            'created_by' => auth()->id(),
        ]);

        $this->processPayment($booking, $usarPaquete);

        return $booking;
    }

    private function processPayment(CollectionBooking $booking, bool $usarPaquete = true): void
    {
        if ($booking->cobro_membresia && $booking->membership_id) {
            $membership = Membership::with(['credits', 'renewals'])->find($booking->membership_id);
            $credit = $membership?->getCredit('recoleccion');

            if ($credit && $credit->saldo_actual > 0 && $membership->creditsUsable()) {
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

        if (! $usarPaquete || ! $booking->rate_id) {
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

    /**
     * Cargo pendiente de facturar de una recolección: null si no tiene tarifa,
     * si ya se facturó (pos_ticket_id) o si ya quedó cubierta por membresía/paquete.
     * Se usa para sumar la tarifa al ticket del servicio de origen cuando ese
     * ticket se genera (checkout de hotel, cita completada, etc.).
     *
     * @return array{item_id: ?int, nombre: string, precio: float}|null
     */
    public function pendingChargeLine(?CollectionBooking $booking): ?array
    {
        if (! $booking || $booking->estado === 'cancelado' || $booking->pos_ticket_id || ! $booking->rate_id) {
            return null;
        }

        if ($booking->package_credit_id) {
            return null;
        }

        if ($booking->cobro_membresia && MembershipCreditMovement::where('referencia_tipo', 'collection')
            ->where('referencia_id', $booking->id)->exists()) {
            return null;
        }

        $booking->loadMissing('rate');
        if (! $booking->rate) {
            return null;
        }

        $tipoLabel = match ($booking->tipo_viaje) {
            'entrega' => 'Entrega',
            'ida_y_vuelta' => 'Recolección y entrega',
            default => 'Recolección',
        };

        return [
            'item_id' => $booking->rate->pos_item_id,
            'nombre' => "{$tipoLabel} — {$booking->rate->nombre} ({$booking->pet?->nombre})",
            'precio' => (float) $booking->rate->precio,
        ];
    }

    /** Encuentra la reservación de recolección activa vinculada a un origen (cita, estancia, paseo). */
    public function findForOrigin(string $origenTipo, int $origenId): ?CollectionBooking
    {
        return CollectionBooking::where('origen_tipo', $origenTipo)
            ->where('origen_id', $origenId)
            ->where('estado', '!=', 'cancelado')
            ->latest('id')
            ->first();
    }
}
