<?php

namespace App\Services;

use App\Models\CollectionBooking;
use App\Models\CollectionSlot;
use App\Models\Event;
use App\Models\EventType;
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
        if (! $booking || in_array($booking->estado, ['cancelado', 'no_show']) || $booking->pos_ticket_id || ! $booking->rate_id) {
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

    /**
     * Línea de cargo para reflejar la recolección como un cargo más de la cita (sección
     * "Cargos" de grooming/vet/entrenamiento), apenas se agenda — a diferencia de
     * pendingChargeLine(), aquí SÍ se incluye cuando quedó cubierta por crédito de paquete
     * (se muestra con el mismo badge "cubierto" que cualquier otro cargo pagado con
     * paquete). Solo se omite cuando la cubre la membresía, igual que el servicio base
     * de la cita, que tampoco se itemiza cuando la membresía lo cubre.
     *
     * @return array{catalog_item_id: ?int, nombre: string, precio: float, package_credit_id: ?int}|null
     */
    public function chargeItemForOrigin(?CollectionBooking $booking): ?array
    {
        if (! $booking || ! $booking->rate_id) {
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
            'catalog_item_id' => $booking->rate->pos_item_id,
            'nombre' => "{$tipoLabel} — {$booking->rate->nombre}",
            'precio' => (float) $booking->rate->precio,
            'package_credit_id' => $booking->package_credit_id,
        ];
    }

    /**
     * Cancela la recolección vinculada a un origen (si sigue pendiente) y revierte el
     * crédito que la haya cubierto. El crédito de PAQUETE solo se restaura aquí cuando
     * $restorePackageCredit es true — en grooming/vet/entrenamiento la tarifa también
     * quedó reflejada como AppointmentItem, y restorePackageCredits() de la cita ya la
     * restaura al recorrer sus items, así que ahí se pasa false para no duplicar.
     */
    public function cancelForOrigin(string $origenTipo, int $origenId, string $motivo, bool $restorePackageCredit = true): void
    {
        $booking = $this->findForOrigin($origenTipo, $origenId);
        if (! $booking || ! in_array($booking->estado, ['programado', 'en_ruta'])) {
            return;
        }

        $booking->update(['estado' => 'cancelado']);

        if ($restorePackageCredit) {
            $this->restorePackageCreditIfAny($booking, $motivo);
        }

        $this->restoreMembershipCreditIfAny($booking, $motivo);
    }

    /**
     * Marca una parada de recolección como "no show" (el chofer llegó y no había nadie).
     * Si "recoleccion.no_show_restaura_credito" está activo en la configuración del
     * negocio (default: sí), libera el crédito de membresía/paquete usado, igual que al
     * cancelar. Si está desactivado, el crédito se queda consumido — el negocio decidió
     * cobrar el intento. En ambos casos queda registrado en el historial de la mascota.
     *
     * No revierte cargos en efectivo ya reflejados en un ticket (ver cancelForOrigin):
     * eso se maneja como reembolso aparte en POS si hace falta.
     */
    public function markNoShow(CollectionBooking $booking, ?string $notas = null): void
    {
        if (! in_array($booking->estado, ['programado', 'en_ruta'])) {
            return;
        }

        $restauraCredito = (bool) (app('current_tenant')->getSetting('recoleccion.no_show_restaura_credito') ?? true);

        $booking->update(['estado' => 'no_show']);

        if ($restauraCredito) {
            $this->restorePackageCreditIfAny($booking, 'Recolección no show.');
            $this->restoreMembershipCreditIfAny($booking, 'Recolección no show.');
        }

        $this->logNoShowEvent($booking, $restauraCredito, $notas);
    }

    private function restorePackageCreditIfAny(CollectionBooking $booking, string $motivo): void
    {
        if (! $booking->package_credit_id) {
            return;
        }

        PackageCreditService::restore(
            $booking->packageCredit,
            1,
            'collection_booking',
            $booking->id,
            "{$motivo} (recolección vinculada)"
        );
    }

    private function restoreMembershipCreditIfAny(CollectionBooking $booking, string $motivo): void
    {
        if (! $booking->cobro_membresia || ! $booking->membership_id) {
            return;
        }

        $movement = MembershipCreditMovement::where('referencia_tipo', 'collection')
            ->where('referencia_id', $booking->id)->first();

        if (! $movement) {
            return;
        }

        $credit = $movement->credit;
        $saldoAntes = $credit->saldo_actual;
        $credit->update(['saldo_actual' => $saldoAntes + 1]);

        MembershipCreditMovement::create([
            'membership_id' => $movement->membership_id,
            'credit_id' => $credit->id,
            'servicio_tipo' => 'recoleccion',
            'tipo' => 'ajuste',
            'cantidad' => 1,
            'saldo_antes' => $saldoAntes,
            'saldo_despues' => $saldoAntes + 1,
            'referencia_tipo' => 'collection',
            'referencia_id' => $booking->id,
            'user_id' => auth()->id(),
            'notas' => "Crédito restaurado: {$motivo} (recolección vinculada).",
        ]);
    }

    /** Deja constancia del no-show en el historial de la mascota (siempre, sin importar la política de cobro). */
    private function logNoShowEvent(CollectionBooking $booking, bool $creditoRestaurado, ?string $notas): void
    {
        $eventType = EventType::firstOrCreate(
            ['nombre' => 'Recolección'],
            ['activo' => true, 'es_configurable' => false]
        );

        $booking->loadMissing('rate');
        $tipoLabel = match ($booking->tipo_viaje) {
            'entrega' => 'Entrega',
            'ida_y_vuelta' => 'Recolección y entrega',
            default => 'Recolección',
        };

        $detalle = $creditoRestaurado
            ? 'No se cobró — se restauró el crédito usado.'
            : 'Se cobró de todas formas, según la configuración del negocio.';

        Event::create([
            'pet_id' => $booking->pet_id,
            'event_type_id' => $eventType->id,
            'fecha' => now()->toDateString(),
            'notas' => trim("{$tipoLabel} no show: no había nadie en la dirección. {$detalle}" . ($notas ? " {$notas}" : '')),
            'created_by' => auth()->id(),
        ]);
    }
}
