<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\WalkBooking;
use App\Models\WalkSlot;
use App\Services\PackageCreditService;
use App\Services\ResponsivaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalkBookingController extends Controller
{
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
            'notas' => 'nullable|string|max:500',
        ]);

        // Prevent duplicate
        if ($walkSlot->bookings()->where('pet_id', $data['pet_id'])->whereIn('estado', ['solicitado', 'aprobado'])->exists()) {
            return back()->withErrors(['pet_id' => 'Esta mascota ya está en este paseo.']);
        }

        if ($walkSlot->cupo_maximo && !$walkSlot->tieneEspacio()) {
            return back()->withErrors(['pet_id' => 'El slot está lleno.']);
        }

        $booking = DB::transaction(function () use ($walkSlot, $data, $request) {
            $booking = WalkBooking::create([
                ...$data,
                'slot_id' => $walkSlot->id,
                'estado' => 'aprobado',
                'solicitud_owner' => false,
                'cobro_membresia' => $request->boolean('cobro_membresia'),
                'created_by' => auth()->id(),
            ]);

            $this->processPayment($booking);

            return $booking;
        });

        return back()->with('success', "Mascota agregada al paseo.");
    }

    /** Approve an owner-requested booking and trigger payment */
    public function approve(WalkBooking $walkBooking): RedirectResponse
    {
        abort_unless($walkBooking->estado === 'solicitado', 422, 'Solo se pueden aprobar solicitudes pendientes.');

        DB::transaction(function () use ($walkBooking) {
            $walkBooking->update(['estado' => 'aprobado']);
            $this->processPayment($walkBooking);
        });

        return back()->with('success', 'Solicitud aprobada.');
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

    private function processPayment(WalkBooking $booking): void
    {
        if ($booking->cobro_membresia && $booking->membership_id) {
            $membership = Membership::with('credits')->find($booking->membership_id);
            $credit = $membership?->getCredit('paseo');

            if ($credit && $credit->saldo_actual > 0) {
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

        PackageCreditService::consume($credit, 1, 'walk_booking', $booking->id, "Paseo — {$booking->pet?->nombre} (slot #{$booking->slot_id})");
        $booking->update(['package_credit_id' => $credit->id]);
    }
}
