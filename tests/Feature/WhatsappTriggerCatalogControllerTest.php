<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsappTriggerCatalogControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.whatsapp_gateway.inbound_secret' => 'test-secret']);
    }

    public function test_el_catalogo_requiere_el_secreto_correcto(): void
    {
        $this->getJson('/api/whatsapp-triggers')->assertForbidden();
        $this->getJson('/api/whatsapp-triggers', ['X-Gateway-Secret' => 'wrong'])->assertForbidden();
    }

    public function test_el_catalogo_devuelve_label_y_categoria_por_disparador(): void
    {
        $response = $this->getJson('/api/whatsapp-triggers', ['X-Gateway-Secret' => 'test-secret']);

        $response->assertOk();
        $response->assertJsonPath('receipt.label', 'Recibo de venta');
        $response->assertJsonPath('receipt.category', 'utility');
        $response->assertJsonPath('membership_expiring.label', 'Membresía por vencer');
        $response->assertJsonCount(9);
    }
}
