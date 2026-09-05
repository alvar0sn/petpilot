<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsappMessageControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeContext(): array
    {
        $tenant = Tenant::create([
            'nombre' => 'Vet Test',
            'slug' => 'vet-test-' . uniqid(),
        ]);

        $admin = User::factory()->tenantAdmin($tenant->id)->create();
        $colaborador = User::factory()->create(['tenant_id' => $tenant->id, 'role' => 'colaborador']);

        return compact('tenant', 'admin', 'colaborador');
    }

    public function test_un_colaborador_no_puede_ver_la_pantalla(): void
    {
        ['colaborador' => $colaborador] = $this->makeContext();

        Http::fake();

        $this->actingAs($colaborador)->get(route('whatsapp.index'))->assertForbidden();
    }

    public function test_el_admin_ve_la_pantalla_aunque_el_gateway_no_responda(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('timeout'));

        $response = $this->actingAs($admin)->get(route('whatsapp.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/WhatsappMessages/Index')
            ->has('triggers', 9)
        );
    }

    public function test_guardar_un_mensaje_exitoso_redirige_con_confirmacion(): void
    {
        ['admin' => $admin, 'tenant' => $tenant] = $this->makeContext();

        Http::fake([
            '*/templates*' => Http::response(['id' => 1], 201),
            '*/account-status*' => Http::response(['own_connected' => true]),
        ]);

        $response = $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'receipt',
            'body' => 'Hola {{1}}, gracias por tu visita.',
        ]);

        $response->assertRedirect(route('whatsapp.index'));
        $response->assertSessionHas('success');

        Http::assertSent(function ($request) use ($tenant) {
            return str_contains($request->url(), '/templates')
                && $request['template_name'] === 'receipt'
                && $request['external_tenant_id'] === (string) $tenant->id;
        });
    }

    public function test_guardar_un_mensaje_fallido_muestra_error_sin_tronar(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake([
            '*/templates*' => Http::response(['message' => 'error'], 500),
            '*/account-status*' => Http::response(['own_connected' => true]),
        ]);

        $response = $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'receipt',
            'body' => 'Hola {{1}}, gracias.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_no_se_puede_guardar_un_disparador_que_no_existe(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake(['*/account-status*' => Http::response(['own_connected' => true])]);

        $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'no-existe',
            'body' => 'Hola.',
        ])->assertNotFound();
    }

    public function test_el_admin_puede_apagar_y_prender_un_disparador(): void
    {
        ['admin' => $admin, 'tenant' => $tenant] = $this->makeContext();

        $this->actingAs($admin)->post(route('whatsapp.toggle', 'receipt'))->assertRedirect();
        $this->assertFalse($tenant->fresh()->getSetting('whatsapp.triggers.receipt.enabled'));

        $this->actingAs($admin)->post(route('whatsapp.toggle', 'receipt'))->assertRedirect();
        $this->assertTrue($tenant->fresh()->getSetting('whatsapp.triggers.receipt.enabled'));
    }

    public function test_guardar_membership_expiring_persiste_los_dias_de_anticipacion(): void
    {
        ['admin' => $admin, 'tenant' => $tenant] = $this->makeContext();

        Http::fake([
            '*/templates*' => Http::response(['id' => 1], 201),
            '*/account-status*' => Http::response(['own_connected' => true]),
        ]);

        $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'membership_expiring',
            'body' => 'Hola {{1}}, tu membresía vence.',
            'days_before' => 5,
        ])->assertRedirect();

        $this->assertSame(5, $tenant->fresh()->getSetting('whatsapp.triggers.membership_expiring.days_before'));
    }

    public function test_el_admin_puede_abrir_la_pagina_de_edicion_con_su_texto_actual(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake([
            '*/templates*' => Http::response([
                'data' => [[
                    'template_name' => 'receipt',
                    'language' => 'es',
                    'category' => 'utility',
                    'body' => 'Gracias {{1}} por tu visita.',
                    'shared' => false,
                    'status' => 'approved',
                    'rejected_reason' => null,
                    'updated_at' => now()->toIso8601String(),
                ]],
            ]),
            '*/account-status*' => Http::response(['own_connected' => true]),
        ]);

        $response = $this->actingAs($admin)->get(route('whatsapp.edit', 'receipt'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/WhatsappMessages/Edit')
            ->where('trigger.body', 'Gracias {{1}} por tu visita.')
            ->where('trigger.is_placeholder', false)
        );
    }

    public function test_la_pagina_de_edicion_de_un_disparador_inexistente_da_404(): void
    {
        ['admin' => $admin] = $this->makeContext();

        $this->actingAs($admin)->get(route('whatsapp.edit', 'no-existe'))->assertNotFound();
    }

    public function test_rechaza_una_variable_pegada_al_final(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake(['*/account-status*' => Http::response(['own_connected' => true])]);

        $response = $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'receipt',
            'body' => 'Hola {{1}}, tu ticket es {{2}}.',
        ]);

        $response->assertSessionHasErrors('body');
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/templates'));
    }

    public function test_rechaza_una_variable_pegada_al_principio(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake(['*/account-status*' => Http::response(['own_connected' => true])]);

        $response = $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'receipt',
            'body' => '{{1}}, gracias por tu compra.',
        ]);

        $response->assertSessionHasErrors('body');
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/templates'));
    }

    public function test_guardar_manda_el_orden_de_variables_usado_al_gateway(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake([
            '*/templates*' => Http::response(['id' => 1], 201),
            '*/account-status*' => Http::response(['own_connected' => true]),
        ]);

        $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'receipt',
            'body' => 'Hola {{1}}, tu ticket: {{2}}. ¡Gracias!',
            'variable_order' => json_encode(['name', 'ticket_url']),
        ])->assertRedirect();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/templates')
            && $request['variable_order'] === ['name', 'ticket_url']);
    }

    public function test_no_se_puede_editar_sin_whatsapp_propio_conectado(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake(['*/account-status*' => Http::response(['own_connected' => false])]);

        $response = $this->actingAs($admin)->get(route('whatsapp.edit', 'receipt'));

        $response->assertRedirect(route('whatsapp.index'));
        $response->assertSessionHas('error');
    }

    public function test_no_se_puede_guardar_sin_whatsapp_propio_conectado(): void
    {
        ['admin' => $admin] = $this->makeContext();

        Http::fake(['*/account-status*' => Http::response(['own_connected' => false])]);

        $response = $this->actingAs($admin)->post(route('whatsapp.update'), [
            'trigger' => 'receipt',
            'body' => 'Hola {{1}}, gracias.',
        ]);

        $response->assertRedirect(route('whatsapp.index'));
        $response->assertSessionHas('error');
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/templates'));
    }
}
