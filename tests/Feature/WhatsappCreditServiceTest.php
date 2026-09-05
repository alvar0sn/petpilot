<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\WhatsappCreditMovement;
use App\Services\WhatsappCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsappCreditServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeTenant(array $overrides = []): Tenant
    {
        return Tenant::create(array_merge([
            'nombre' => 'Vet Test',
            'slug' => 'vet-test-' . uniqid(),
        ], $overrides));
    }

    public function test_hasCredits_es_falso_cuando_no_quedan_creditos(): void
    {
        $tenant = $this->makeTenant(['whatsapp_free_credits' => 0, 'whatsapp_purchased_credits' => 0]);

        $this->assertFalse(WhatsappCreditService::hasCredits($tenant));
    }

    public function test_consume_descuenta_primero_de_gratis(): void
    {
        $tenant = $this->makeTenant(['whatsapp_free_credits' => 5, 'whatsapp_purchased_credits' => 3]);

        WhatsappCreditService::consume($tenant, 'ref-1');

        $tenant->refresh();
        $this->assertSame(4, $tenant->whatsapp_free_credits);
        $this->assertSame(3, $tenant->whatsapp_purchased_credits);
    }

    public function test_consume_usa_comprados_cuando_no_hay_gratis(): void
    {
        $tenant = $this->makeTenant(['whatsapp_free_credits' => 0, 'whatsapp_purchased_credits' => 3]);

        WhatsappCreditService::consume($tenant, 'ref-1');

        $tenant->refresh();
        $this->assertSame(0, $tenant->whatsapp_free_credits);
        $this->assertSame(2, $tenant->whatsapp_purchased_credits);
    }

    public function test_consume_es_idempotente_por_external_reference(): void
    {
        $tenant = $this->makeTenant(['whatsapp_free_credits' => 5]);

        WhatsappCreditService::consume($tenant, 'ref-1');
        WhatsappCreditService::consume($tenant, 'ref-1');

        $this->assertSame(4, $tenant->fresh()->whatsapp_free_credits);
        $this->assertSame(1, WhatsappCreditMovement::where('external_reference', 'ref-1')->count());
    }

    public function test_addPurchased_es_idempotente_por_mp_payment_id(): void
    {
        $tenant = $this->makeTenant(['whatsapp_purchased_credits' => 0]);

        $first = WhatsappCreditService::addPurchased($tenant, 200, 'mp-1');
        $second = WhatsappCreditService::addPurchased($tenant, 200, 'mp-1');

        $this->assertTrue($first);
        $this->assertFalse($second);
        $this->assertSame(200, $tenant->fresh()->whatsapp_purchased_credits);
    }

    public function test_resetFree_otorga_el_default_global_si_no_hay_override(): void
    {
        SystemSetting::set('whatsapp_free_credits_default', 500);
        $tenant = $this->makeTenant([
            'whatsapp_free_credits' => 3,
            'whatsapp_credits_reset_at' => today(),
        ]);

        WhatsappCreditService::resetFree($tenant);

        $this->assertSame(500, $tenant->fresh()->whatsapp_free_credits);
    }

    public function test_resetFree_respeta_el_override_del_tenant(): void
    {
        $tenant = $this->makeTenant([
            'whatsapp_free_credits' => 3,
            'whatsapp_free_credits_monthly' => 2000,
            'whatsapp_credits_reset_at' => today(),
        ]);

        WhatsappCreditService::resetFree($tenant);

        $this->assertSame(2000, $tenant->fresh()->whatsapp_free_credits);
    }

    /**
     * Si el reset se quedó atrasado varios meses (el job no corrió), debe
     * otorgar una sola vez y dejar la próxima fecha en el futuro — no
     * regalar créditos de más por cada mes que se saltó.
     */
    public function test_resetFree_con_fecha_muy_atrasada_solo_otorga_una_vez(): void
    {
        $tenant = $this->makeTenant([
            'whatsapp_free_credits' => 0,
            'whatsapp_free_credits_monthly' => 1000,
            'whatsapp_credits_reset_at' => today()->subMonths(4),
        ]);

        WhatsappCreditService::resetFree($tenant);

        $tenant->refresh();
        $this->assertSame(1000, $tenant->whatsapp_free_credits);
        $this->assertTrue($tenant->whatsapp_credits_reset_at->gt(today()));
        $this->assertSame(1, WhatsappCreditMovement::where('type', 'free_grant')->count());
    }

    public function test_adjustFree_registra_el_ajuste_manual(): void
    {
        $tenant = $this->makeTenant(['whatsapp_free_credits' => 10]);

        WhatsappCreditService::adjustFree($tenant, -3);

        $this->assertSame(7, $tenant->fresh()->whatsapp_free_credits);
        $this->assertSame('manual_adjustment', WhatsappCreditMovement::first()->type);
    }

    public function test_adjustFree_no_permite_dejar_creditos_negativos(): void
    {
        $tenant = $this->makeTenant(['whatsapp_free_credits' => 2]);

        $this->expectException(\InvalidArgumentException::class);

        WhatsappCreditService::adjustFree($tenant, -5);
    }
}
