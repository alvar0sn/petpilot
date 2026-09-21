<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\PosConfig;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use App\Models\WalkBooking;
use App\Models\WalkSlot;
use App\Services\CollectionBookingService;
use App\Services\PackageCreditService;
use App\Services\ResponsivaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalkBookingController extends Controller
{
    public function __construct(private readonly CollectionBookingService $collectionBookings)
    {
    }

    /** FD adds a pet manually — auto-approves and triggers payment */
    public function store(Request $request, WalkSlot $walkSlot): RedirectResponse
    {
        abort_unless($walkSlot->estado === 'abierto', 422, 'Este slot no está abierto.');

        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'owner_id' => 'required|exists:owners,id',
            'rate_id' => 'nullable|exists:walk_rates,id',
            'cobro_membresia' => 'boolean',
            'membership_id' => 'nullable|exists:memberships,id',
            'usar_paquete' => 'boolean',
            'notas' => 'nullable|string|max:500',
            'recoleccion'                 => 'boolean',
            'recoleccion_rate_id'         => 'required_if:recoleccion,true|exists:collection_rates,id',
            'recoleccion_tipo_viaje'      => 'nullable|in:recoleccion,entrega,ida_y_vuelta',
            'recoleccion_direccion'       => 'nullable|string|max:500',
            'recoleccion_usar_paquete'    => 'boolean',
        ]);

        // Prevent duplicate
        if ($walkSlot->bookings()->where('pet_id', $data['pet_id'])->whereIn('estado', ['solicitado', 'aprobado'])->exists()) {
            return back()->withErrors(['pet_id' => 'Esta mascota ya está en este paseo.']);
        }

        if ($walkSlot->cupo_maximo && !$walkSlot->tieneEspacio()) {
            return back()->withErrors(['pet_id' => 'El slot está lleno.']);
        }

        $usarPaquete = $data['usar_paquete'] ?? true;
        $quiereRecoleccion = $request->boolean('recoleccion') && !empty($data['recoleccion_rate_id']);

        $ticket = null;

        DB::transaction(function () use ($walkSlot, $data, $request, $usarPaquete, $quiereRecoleccion, &$ticket) {
            $booking = WalkBooking::create([
                ...$data,
                'slot_id' => $walkSlot->id,
                'estado' => 'aprobado',
                'solicitud_owner' => false,
                'cobro_membresia' => $request->boolean('cobro_membresia'),
                'created_by' => auth()->id(),
            ]);

            $walkCubierto = $this->processPayment($booking, $usarPaquete);

            if ($quiereRecoleccion) {
                $this->collectionBookings->createForOrigin([
                    'pet_id' => $data['pet_id'],
                    'owner_id' => $data['owner_id'],
                    'fecha' => $walkSlot->fecha,
                    'direccion' => $data['recoleccion_direccion'] ?? null,
                    'rate_id' => $data['recoleccion_rate_id'],
                    'tipo_viaje' => $data['recoleccion_tipo_viaje'] ?? 'recoleccion',
                    'cobro_membresia' => $booking->cobro_membresia,
                    'membership_id' => $booking->membership_id,
                    'usar_paquete' => $data['recoleccion_usar_paquete'] ?? true,
                    'origen_tipo' => 'walk_booking',
                    'origen_id' => $booking->id,
                ]);
            }

            $ticket = $this->chargeIfNeeded($booking, $walkCubierto);
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])->with('success', 'Mascota agregada al paseo. Completa el cobro en POS.')
            : back()->with('success', 'Mascota agregada al paseo.');
    }

    /** Approve an owner-requested booking and trigger payment */
    public function approve(WalkBooking $walkBooking): RedirectResponse
    {
        abort_unless($walkBooking->estado === 'solicitado', 422, 'Solo se pueden aprobar solicitudes pendientes.');

        $ticket = DB::transaction(function () use ($walkBooking) {
            $walkBooking->update(['estado' => 'aprobado']);
            $walkCubierto = $this->processPayment($walkBooking);

            return $this->chargeIfNeeded($walkBooking, $walkCubierto);
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])->with('success', 'Solicitud aprobada. Completa el cobro en POS.')
            : back()->with('success', 'Solicitud aprobada.');
    }

    public function cancel(WalkBooking $walkBooking): RedirectResponse
    {
        abort_unless(in_array($walkBooking->estado, ['solicitado', 'aprobado']), 422, 'No se puede cancelar.');

        DB::transaction(function () use ($walkBooking) {
            $walkBooking->update(['estado' => 'cancelado']);

            if ($walkBooking->package_credit_id) {
                PackageCreditService::restore(
                    $walkBooking->packageCredit,
                    1,
                    'walk_booking',
                    $walkBooking->id,
                    "Paseo cancelado — {$walkBooking->pet?->nombre}"
                );
            }

            $this->collectionBookings->cancelForOrigin('walk_booking', $walkBooking->id, 'Paseo cancelado.');
        });

        return back()->with('success', 'Reserva cancelada.');
    }

    public function sendResponsiva(WalkBooking $walkBooking): RedirectResponse
    {
        if ($walkBooking->responsiva_firmado_at) {
            return back()->with('error', 'Esta responsiva ya fue firmada.');
        }

        $url = ResponsivaService::send($walkBooking, 'paseos');

        return back()->with(['success' => "Responsiva enviada. Link: {$url}", 'responsiva_url' => $url]);
    }

    public function downloadResponsiva(WalkBooking $walkBooking): \Symfony\Component\HttpFoundation\Response
    {
        return ResponsivaService::download($walkBooking);
    }

    /** @return bool Si el paseo quedó cubierto por crédito de membresía o de paquete. */
    private function processPayment(WalkBooking $booking, bool $usarPaquete = true): bool
    {
        if ($booking->cobro_membresia && $booking->membership_id) {
            $membership = Membership::with(['credits', 'renewals'])->find($booking->membership_id);
            $credit = $membership?->getCredit('paseo');

            if ($credit && $credit->saldo_actual > 0 && $membership->creditsUsable()) {
                $saldoAntes = $credit->saldo_actual;
                $saldoNuevo = $saldoAntes - 1;
                $credit->update(['saldo_actual' => $saldoNuevo]);

                MembershipCreditMovement::create([
                    'membership_id' => $membership->id,
                    'credit_id' => $credit->id,
                    'servicio_tipo' => 'paseo',
                    'tipo' => 'consumo',
                    'cantidad' => -1,
                    'saldo_antes' => $saldoAntes,
                    'saldo_despues' => $saldoNuevo,
                    'referencia_tipo' => 'walk',
                    'referencia_id' => $booking->id,
                    'user_id' => auth()->id(),
                    'notas' => "Paseo — {$booking->pet?->nombre} (slot #{$booking->slot_id})",
                ]);

                return true;
            }
        }

        // Sin membresía (o sin saldo) — ¿tiene crédito de paquete para esta tarifa exacta?
        if (! $usarPaquete || ! $booking->rate_id) {
            return false;
        }

        $booking->loadMissing('rate');
        if (! $booking->rate?->pos_item_id) {
            return false;
        }

        $credit = PackageCreditService::findCredit($booking->pet_id, $booking->rate->pos_item_id);
        if (! $credit) {
            return false;
        }

        PackageCreditService::consume($credit, 1, 'walk_booking', $booking->id, "Paseo — {$booking->pet?->nombre} (slot #{$booking->slot_id})");
        $booking->update(['package_credit_id' => $credit->id]);

        return true;
    }

    /**
     * Genera el ticket en POS del paseo (si el paseo no quedó cubierto por crédito y
     * tiene tarifa) sumando, en la misma línea, la tarifa de recolección pendiente si se
     * solicitó al agendar. Es el único punto de facturación automática de paseos.
     */
    private function chargeIfNeeded(WalkBooking $booking, bool $walkCubierto): ?PosTicket
    {
        $recoleccion = $this->collectionBookings->findForOrigin('walk_booking', $booking->id);
        $cargoRecoleccion = $this->collectionBookings->pendingChargeLine($recoleccion);

        $booking->loadMissing('rate');
        $cargoPaseo = (! $walkCubierto && $booking->rate_id && $booking->rate)
            ? ['item_id' => $booking->rate->pos_item_id, 'nombre' => "Paseo — {$booking->rate->nombre} ({$booking->pet?->nombre})", 'precio' => (float) $booking->rate->precio]
            : null;

        if (! $cargoPaseo && ! $cargoRecoleccion) {
            return null;
        }

        $shift = PosShift::where('estado', 'abierto')->first();
        $subtotal = ($cargoPaseo['precio'] ?? 0) + ($cargoRecoleccion['precio'] ?? 0);

        $ticket = PosTicket::create([
            'folio' => $this->nextFolio(),
            'owner_id' => $booking->owner_id,
            'estado' => 'abierto',
            'shift_open_id' => $shift?->id,
            'user_open_id' => auth()->id(),
            'user_last_edit_id' => auth()->id(),
            'subtotal' => $subtotal,
            'total' => $subtotal,
        ]);

        foreach (array_filter([$cargoPaseo, $cargoRecoleccion]) as $cargo) {
            PosTicketLine::create([
                'ticket_id' => $ticket->id,
                'item_id' => $cargo['item_id'],
                'nombre_snapshot' => $cargo['nombre'],
                'precio_snapshot' => $cargo['precio'],
                'costo_snapshot' => 0,
                'cantidad' => 1,
                'subtotal' => $cargo['precio'],
            ]);
        }

        if ($cargoRecoleccion) {
            $recoleccion->update(['pos_ticket_id' => $ticket->id]);
        }

        $booking->update(['pos_ticket_id' => $ticket->id]);

        return $ticket;
    }

    private function nextFolio(): int
    {
        $config = PosConfig::where('clave', 'folio_siguiente')->first();
        $folio = $config ? (int) $config->valor : 1;
        $config
            ? $config->update(['valor' => $folio + 1])
            : PosConfig::create(['clave' => 'folio_siguiente', 'valor' => $folio + 1]);
        return $folio;
    }
}
