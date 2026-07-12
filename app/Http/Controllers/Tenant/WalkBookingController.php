<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\WalkBooking;
use App\Models\WalkSlot;
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

        $walkBooking->update(['estado' => 'cancelado']);

        return back()->with('success', 'Reserva cancelada.');
    }

    private function processPayment(WalkBooking $booking): void
    {
        if (!$booking->cobro_membresia || !$booking->membership_id) {
            return;
        }

        $membership = Membership::with('credits')->find($booking->membership_id);
        $credit = $membership?->getCredit('paseo');

        if (!$credit || $credit->saldo_actual <= 0) {
            return;
        }

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
    }
}
