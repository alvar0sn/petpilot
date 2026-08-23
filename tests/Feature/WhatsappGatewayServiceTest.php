<?php

namespace Tests\Feature;

use App\Jobs\SendWhatsappGatewayMessage;
use App\Models\Owner;
use App\Models\Tenant;
use App\Models\WhatsappGatewayLog;
use App\Services\WhatsappGatewayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WhatsappGatewayServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeContext(): array
    {
        $tenant = Tenant::create([
            'nombre' => 'Vet Test',
            'slug' => 'vet-test-' . uniqid(),
        ]);
        $tenant->setSetting('whatsapp.enabled', true);
        $tenant->refresh();

        $owner = Owner::create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Juan',
            'apellidos' => 'Pérez',
            'telefono' => '5512345678',
        ]);

        return compact('tenant', 'owner');
    }

    public function test_arma_los_params_en_el_orden_del_catalogo(): void
    {
        Queue::fake();

        ['tenant' => $tenant, 'owner' => $owner] = $this->makeContext();

        WhatsappGatewayService::send($tenant, 'receipt', $owner, [
            'ticket_url' => 'https://vetrkt.app/t/abc',
            'total' => '$500.00',
            'folio' => '1042',
            'date' => '23 de agosto 2026',
        ], 'receipt:1');

        $log = WhatsappGatewayLog::first();
        $this->assertNotNull($log);
        $this->assertSame([
            'Juan',
            'Juan Pérez',
            '5512345678',
            'https://vetrkt.app/t/abc',
            '$500.00',
            '1042',
            '23 de agosto 2026',
        ], $log->payload['params']);
        $this->assertSame((string) $tenant->id, $log->payload['external_tenant_id']);
        $this->assertSame('receipt', $log->payload['template']);

        Queue::assertPushed(SendWhatsappGatewayMessage::class);
    }

    public function test_no_hace_nada_si_el_disparador_esta_apagado_aunque_el_maestro_este_prendido(): void
    {
        Queue::fake();

        ['tenant' => $tenant, 'owner' => $owner] = $this->makeContext();
        $tenant->setSetting('whatsapp.triggers.receipt.enabled', false);
        $tenant->refresh();

        WhatsappGatewayService::send($tenant, 'receipt', $owner, ['ticket_url' => 'x', 'total' => 'x', 'folio' => 'x', 'date' => 'x']);

        $this->assertSame(0, WhatsappGatewayLog::count());
        Queue::assertNotPushed(SendWhatsappGatewayMessage::class);
    }

    public function test_no_hace_nada_si_el_maestro_esta_apagado(): void
    {
        Queue::fake();

        $tenant = Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);
        $owner = Owner::create(['tenant_id' => $tenant->id, 'nombre' => 'Juan', 'telefono' => '5512345678']);

        WhatsappGatewayService::send($tenant, 'receipt', $owner, ['ticket_url' => 'x', 'total' => 'x', 'folio' => 'x', 'date' => 'x']);

        $this->assertSame(0, WhatsappGatewayLog::count());
        Queue::assertNotPushed(SendWhatsappGatewayMessage::class);
    }

    public function test_no_hace_nada_si_el_owner_no_tiene_telefono(): void
    {
        Queue::fake();

        ['tenant' => $tenant] = $this->makeContext();
        $owner = Owner::create(['tenant_id' => $tenant->id, 'nombre' => 'Sin Telefono', 'telefono' => '']);

        WhatsappGatewayService::send($tenant, 'receipt', $owner, ['ticket_url' => 'x', 'total' => 'x', 'folio' => 'x', 'date' => 'x']);

        $this->assertSame(0, WhatsappGatewayLog::count());
    }
}
