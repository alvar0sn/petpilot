<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsappCreditMercadoPagoControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_un_pago_aprobado_acredita_los_creditos_comprados(): void
    {
        config(['services.whatsapp_credits.mp_access_token' => 'platform-token']);

        $tenant = Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);

        Http::fake([
            'api.mercadopago.com/v1/payments/*' => Http::response([
                'status' => 'approved',
                'external_reference' => "credits|{$tenant->id}|abc",
                'transaction_amount' => 100,
            ]),
        ]);

        $this->postJson(route('webhooks.whatsapp-credits.mercadopago'), [
            'type' => 'payment',
            'data' => ['id' => 'mp-1'],
        ])->assertOk();

        $this->assertSame(200, $tenant->fresh()->whatsapp_purchased_credits);
    }

    public function test_un_pago_no_aprobado_no_acredita_nada(): void
    {
        config(['services.whatsapp_credits.mp_access_token' => 'platform-token']);

        $tenant = Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);

        Http::fake([
            'api.mercadopago.com/v1/payments/*' => Http::response([
                'status' => 'pending',
                'external_reference' => "credits|{$tenant->id}|abc",
                'transaction_amount' => 100,
            ]),
        ]);

        $this->postJson(route('webhooks.whatsapp-credits.mercadopago'), [
            'type' => 'payment',
            'data' => ['id' => 'mp-1'],
        ])->assertOk();

        $this->assertSame(0, $tenant->fresh()->whatsapp_purchased_credits);
    }

    public function test_una_notificacion_que_no_es_de_pago_se_ignora(): void
    {
        Http::fake();

        $this->postJson(route('webhooks.whatsapp-credits.mercadopago'), [
            'type' => 'merchant_order',
        ])->assertOk();

        Http::assertNothingSent();
    }
}
