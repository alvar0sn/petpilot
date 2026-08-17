<?php

namespace Tests\Feature;

use App\Models\PaymentRequest;
use App\Models\PosPayment;
use App\Models\PosTicket;
use App\Models\Tenant;
use App\Models\TenantMercadoPagoConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MercadoPagoWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function makePaymentRequest(): array
    {
        $tenant = Tenant::create([
            'nombre' => 'Vet Test',
            'slug' => 'vet-test-' . uniqid(),
        ]);

        $config = TenantMercadoPagoConfig::create([
            'tenant_id' => $tenant->id,
            'access_token' => 'TEST-ACCESS-TOKEN',
            'webhook_secret' => 'shh-secret',
            'activo' => true,
        ]);

        $ticket = PosTicket::create([
            'tenant_id' => $tenant->id,
            'folio' => 'A-1',
            'estado' => 'abierto',
            'subtotal' => 100,
            'total' => 100,
        ]);

        $paymentRequest = PaymentRequest::create([
            'tenant_id' => $tenant->id,
            'pos_ticket_id' => $ticket->id,
            'monto' => 100,
            'estado' => 'pendiente',
        ]);

        return compact('tenant', 'config', 'ticket', 'paymentRequest');
    }

    private function signature(string $mpPaymentId, string $secret, string $requestId, int $ts): string
    {
        $manifest = "id:{$mpPaymentId};request-id:{$requestId};ts:{$ts};";

        return hash_hmac('sha256', $manifest, $secret);
    }

    public function test_approved_payment_with_valid_signature_marks_ticket_paid(): void
    {
        ['config' => $config, 'ticket' => $ticket, 'paymentRequest' => $paymentRequest] = $this->makePaymentRequest();

        Http::fake([
            'api.mercadopago.com/v1/payments/*' => Http::response([
                'id' => 'MP-PAY-1',
                'status' => 'approved',
                'external_reference' => $paymentRequest->external_reference,
            ], 200),
        ]);

        $ts = time();
        $requestId = 'req-123';
        $sig = $this->signature('MP-PAY-1', $config->webhook_secret, $requestId, $ts);

        $response = $this->postJson(
            "/webhooks/mercadopago/{$paymentRequest->token}?data_id=MP-PAY-1&type=payment",
            [],
            ['x-signature' => "ts={$ts},v1={$sig}", 'x-request-id' => $requestId]
        );

        $response->assertNoContent();

        $ticket->refresh();
        $paymentRequest->refresh();

        $this->assertSame('pagado', $ticket->estado);
        $this->assertSame('aprobado', $paymentRequest->estado);
        $this->assertNotNull($ticket->cobrado_at);
        $this->assertDatabaseHas('pos_payments', [
            'ticket_id' => $ticket->id,
            'monto' => 100,
        ]);
    }

    public function test_invalid_signature_does_not_mark_ticket_paid(): void
    {
        ['ticket' => $ticket, 'paymentRequest' => $paymentRequest] = $this->makePaymentRequest();

        Http::fake([
            'api.mercadopago.com/v1/payments/*' => Http::response([
                'id' => 'MP-PAY-1',
                'status' => 'approved',
                'external_reference' => $paymentRequest->external_reference,
            ], 200),
        ]);

        $response = $this->postJson(
            "/webhooks/mercadopago/{$paymentRequest->token}?data_id=MP-PAY-1&type=payment",
            [],
            ['x-signature' => 'ts=1,v1=bogus', 'x-request-id' => 'req-123']
        );

        $response->assertNoContent();

        $ticket->refresh();
        $paymentRequest->refresh();

        $this->assertSame('abierto', $ticket->estado);
        $this->assertSame('pendiente', $paymentRequest->estado);
        $this->assertDatabaseMissing('pos_payments', ['ticket_id' => $ticket->id]);
    }

    public function test_duplicate_notification_does_not_duplicate_payment(): void
    {
        ['config' => $config, 'ticket' => $ticket, 'paymentRequest' => $paymentRequest] = $this->makePaymentRequest();

        Http::fake([
            'api.mercadopago.com/v1/payments/*' => Http::response([
                'id' => 'MP-PAY-1',
                'status' => 'approved',
                'external_reference' => $paymentRequest->external_reference,
            ], 200),
        ]);

        $ts = time();
        $requestId = 'req-123';
        $sig = $this->signature('MP-PAY-1', $config->webhook_secret, $requestId, $ts);
        $headers = ['x-signature' => "ts={$ts},v1={$sig}", 'x-request-id' => $requestId];
        $url = "/webhooks/mercadopago/{$paymentRequest->token}?data_id=MP-PAY-1&type=payment";

        $this->postJson($url, [], $headers)->assertNoContent();
        $this->postJson($url, [], $headers)->assertNoContent();

        $this->assertSame(1, PosPayment::where('ticket_id', $ticket->id)->count());
    }
}
