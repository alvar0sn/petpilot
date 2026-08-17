<?php

namespace App\Services;

use App\Models\PaymentRequest;
use App\Models\PosPayment;
use App\Models\PosPaymentMethod;
use App\Models\PosTicket;
use App\Models\Tenant;
use App\Models\TenantMercadoPagoConfig;
use Illuminate\Support\Facades\DB;

class PaymentRequestService
{
    public function __construct(
        private MercadoPagoService $mercadoPago,
        private GhlService $ghl,
    ) {
    }

    /**
     * @return array{request: PaymentRequest, link: string, wa_sent: bool}
     */
    public function createForTicket(PosTicket $ticket, ?string $notas = null): array
    {
        $config = TenantMercadoPagoConfig::where('tenant_id', $ticket->tenant_id)->first();

        if (! $config || ! $config->activo || ! $config->access_token) {
            throw new \RuntimeException('Mercado Pago no está configurado o activo para este negocio.');
        }

        $tenant = Tenant::find($ticket->tenant_id);

        $paymentRequest = PaymentRequest::create([
            'tenant_id' => $ticket->tenant_id,
            'pos_ticket_id' => $ticket->id,
            'monto' => $ticket->total,
            'estado' => 'pendiente',
            'notas' => $notas,
            'created_by' => auth()->id(),
        ]);

        $link = route('payment.public', $paymentRequest->token);

        $preference = $this->mercadoPago->createPreference($config->access_token, [
            'descripcion' => trim("Pago — {$tenant?->nombre} — Ticket #{$ticket->folio}"),
            'monto' => $ticket->total,
            'external_reference' => $paymentRequest->external_reference,
            'notification_url' => route('webhooks.mercadopago', $paymentRequest->token),
            'back_url' => $link,
        ]);

        $paymentRequest->update([
            'mp_preference_id' => $preference['preference_id'],
            'mp_init_point' => $preference['init_point'],
        ]);

        $ticket->loadMissing('owner:id,nombre,apellidos,telefono,email,ghl_contact_id');
        $waSent = false;

        if ($ticket->owner) {
            $waSent = $this->ghl->sendWebhook($ticket->tenant_id, 'solicitud_pago', [
                'ghl_contact_id' => $ticket->owner->ghl_contact_id,
                'owner_nombre' => $ticket->owner->nombre,
                'owner_apellidos' => $ticket->owner->apellidos,
                'owner_telefono' => $ticket->owner->telefono,
                'owner_email' => $ticket->owner->email,
                'negocio' => $tenant?->nombre,
                'monto' => number_format((float) $ticket->total, 2, '.', ''),
                'link' => $link,
            ]);
        }

        return [
            'request' => $paymentRequest,
            'link' => $link,
            'wa_sent' => $waSent,
        ];
    }

    /**
     * Idempotente: si la solicitud ya no está pendiente, o el ticket ya está
     * pagado (carrera con un cobro manual en POS), no vuelve a acreditar.
     */
    public function confirmApproved(PaymentRequest $paymentRequest, string $mpPaymentId): void
    {
        DB::transaction(function () use ($paymentRequest, $mpPaymentId) {
            $paymentRequest = PaymentRequest::withoutGlobalScopes()
                ->whereKey($paymentRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($paymentRequest->estado !== 'pendiente') {
                return;
            }

            $ticket = PosTicket::withoutGlobalScopes()
                ->whereKey($paymentRequest->pos_ticket_id)
                ->lockForUpdate()
                ->first();

            if (! $ticket) {
                return;
            }

            if ($ticket->estado === 'pagado') {
                $paymentRequest->update([
                    'estado' => 'aprobado',
                    'mp_payment_id' => $mpPaymentId,
                    'paid_at' => now(),
                ]);
                return;
            }

            $method = PosPaymentMethod::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $ticket->tenant_id, 'nombre' => 'Mercado Pago'],
                ['activo' => true, 'orden' => 99]
            );

            $payment = PosPayment::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'payment_method_id' => $method->id,
                'monto' => $ticket->total,
            ]);

            $ticket->update(['estado' => 'pagado', 'cobrado_at' => now()]);

            $paymentRequest->update([
                'estado' => 'aprobado',
                'mp_payment_id' => $mpPaymentId,
                'pos_payment_id' => $payment->id,
                'paid_at' => now(),
            ]);
        });
    }
}
