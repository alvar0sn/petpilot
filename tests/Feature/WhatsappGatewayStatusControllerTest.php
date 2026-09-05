<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\WhatsappCreditMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsappGatewayStatusControllerTest extends TestCase
{
    use RefreshDatabase;

    private function sign(array $payload, string $secret): array
    {
        $body = json_encode($payload);
        return [$body, 'sha256=' . hash_hmac('sha256', $body, $secret)];
    }

    public function test_un_mensaje_enviado_consume_un_credito(): void
    {
        config(['services.whatsapp_gateway.inbound_secret' => 'topsecret']);

        $tenant = Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);

        [$body, $signature] = $this->sign([
            'event' => 'message.status',
            'status' => 'sent',
            'external_tenant_id' => (string) $tenant->id,
            'external_reference' => 'receipt:1',
        ], 'topsecret');

        $this->call('POST', route('webhooks.whatsapp-gateway.status'), [], [], [], [
            'HTTP_X-Gateway-Signature' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertOk();

        $this->assertSame(999, $tenant->fresh()->whatsapp_free_credits);
        $this->assertSame(1, WhatsappCreditMovement::where('external_reference', 'receipt:1')->count());
    }

    public function test_un_mensaje_fallido_no_consume_credito(): void
    {
        config(['services.whatsapp_gateway.inbound_secret' => 'topsecret']);

        $tenant = Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);

        [$body, $signature] = $this->sign([
            'event' => 'message.status',
            'status' => 'failed',
            'external_tenant_id' => (string) $tenant->id,
            'external_reference' => 'receipt:1',
        ], 'topsecret');

        $this->call('POST', route('webhooks.whatsapp-gateway.status'), [], [], [], [
            'HTTP_X-Gateway-Signature' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertNoContent();

        $this->assertSame(1000, $tenant->fresh()->whatsapp_free_credits);
    }

    public function test_una_firma_invalida_se_rechaza(): void
    {
        config(['services.whatsapp_gateway.inbound_secret' => 'topsecret']);

        $tenant = Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);

        $body = json_encode([
            'event' => 'message.status',
            'status' => 'sent',
            'external_tenant_id' => (string) $tenant->id,
            'external_reference' => 'receipt:1',
        ]);

        $this->call('POST', route('webhooks.whatsapp-gateway.status'), [], [], [], [
            'HTTP_X-Gateway-Signature' => 'sha256=invalida',
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertForbidden();

        $this->assertSame(1000, $tenant->fresh()->whatsapp_free_credits);
    }
}
