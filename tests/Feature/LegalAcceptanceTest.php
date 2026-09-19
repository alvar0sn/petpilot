<?php

namespace Tests\Feature;

use App\Models\LegalAcceptance;
use App\Models\LegalDocument;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegalAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private function makeTenant(): Tenant
    {
        return Tenant::create(['nombre' => 'Vet Test', 'slug' => 'vet-test-' . uniqid()]);
    }

    private function publishCurrent(string $type, string $version = '1.0'): LegalDocument
    {
        $doc = LegalDocument::create([
            'type' => $type,
            'version' => $version,
            'content' => '<p>contenido</p>',
            'is_current' => false,
        ]);
        $doc->makeCurrent();

        return $doc->fresh();
    }

    public function test_tenant_admin_is_blocked_when_there_is_no_prior_acceptance(): void
    {
        $tenant = $this->makeTenant();
        $this->publishCurrent('tos');
        $this->publishCurrent('data_agreement');

        $admin = User::factory()->tenantAdmin($tenant->id)->create();

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertRedirect(route('legal.accept'));
    }

    public function test_tenant_admin_is_blocked_when_accepted_version_is_outdated(): void
    {
        $tenant = $this->makeTenant();
        $tos = $this->publishCurrent('tos', '1.0');
        $this->publishCurrent('data_agreement', '1.0');

        $admin = User::factory()->tenantAdmin($tenant->id)->create();

        LegalAcceptance::create([
            'tenant_id' => $tenant->id,
            'user_id' => $admin->id,
            'legal_document_id' => $tos->id,
            'accepted_at' => now(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
        ]);

        // Se publica una nueva versión de tos, que pasa a ser la vigente.
        $this->publishCurrent('tos', '2.0');

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertRedirect(route('legal.accept'));
    }

    public function test_tenant_admin_with_current_acceptance_is_not_blocked(): void
    {
        $tenant = $this->makeTenant();
        $tos = $this->publishCurrent('tos');
        $dataAgreement = $this->publishCurrent('data_agreement');

        $admin = User::factory()->tenantAdmin($tenant->id)->create();

        foreach ([$tos, $dataAgreement] as $doc) {
            LegalAcceptance::create([
                'tenant_id' => $tenant->id,
                'user_id' => $admin->id,
                'legal_document_id' => $doc->id,
                'accepted_at' => now(),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'test',
            ]);
        }

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
    }

    public function test_colaborador_is_not_blocked_by_pending_acceptance(): void
    {
        $tenant = $this->makeTenant();
        $this->publishCurrent('tos');
        $this->publishCurrent('data_agreement');

        $colaborador = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'colaborador',
        ]);

        $response = $this->actingAs($colaborador)->get('/dashboard');

        $response->assertOk();
    }

    public function test_accepting_records_ip_address_and_user_agent(): void
    {
        $tenant = $this->makeTenant();
        $this->publishCurrent('tos');
        $this->publishCurrent('data_agreement');

        $admin = User::factory()->tenantAdmin($tenant->id)->create();

        $response = $this
            ->actingAs($admin)
            ->withServerVariables(['REMOTE_ADDR' => '10.1.2.3'])
            ->post('/legal/aceptar', ['accepted' => true], ['User-Agent' => 'TestAgent/1.0']);

        $response->assertRedirect(route('dashboard'));

        $this->assertDatabaseCount('legal_acceptances', 2);
        $this->assertDatabaseHas('legal_acceptances', [
            'tenant_id' => $tenant->id,
            'user_id' => $admin->id,
            'ip_address' => '10.1.2.3',
            'user_agent' => 'TestAgent/1.0',
        ]);

        // Ya no debe quedar pendiente — no lo vuelve a bloquear.
        $this->actingAs($admin)->get('/dashboard')->assertOk();
    }

    public function test_public_legal_pages_are_accessible_without_auth(): void
    {
        $this->publishCurrent('tos');

        $response = $this->get('/legal/terminos');

        $response->assertOk();
    }
}
