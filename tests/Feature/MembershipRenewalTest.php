<?php

namespace Tests\Feature;

use App\Models\Membership;
use App\Models\MembershipCredit;
use App\Models\MembershipPlan;
use App\Models\MembershipPlanCredit;
use App\Models\MembershipRenewal;
use App\Models\Owner;
use App\Models\Pet;
use App\Models\PosCatalogItem;
use App\Models\PosCategory;
use App\Models\PosPaymentMethod;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MembershipRenewalTest extends TestCase
{
    use RefreshDatabase;

    private function makeMembershipContext(): array
    {
        $tenant = Tenant::create([
            'nombre' => 'Vet Test',
            'slug' => 'vet-test-' . uniqid(),
        ]);

        $user = User::factory()->tenantAdmin($tenant->id)->create();

        $owner = Owner::create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Juan Pérez',
            'telefono' => '5512345678',
        ]);

        $pet = Pet::create([
            'tenant_id' => $tenant->id,
            'owner_id' => $owner->id,
            'nombre' => 'Firulais',
        ]);

        $category = PosCategory::create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Membresías',
            'orden' => 1,
            'activo' => true,
        ]);

        $item = PosCatalogItem::create([
            'tenant_id' => $tenant->id,
            'categoria_id' => $category->id,
            'nombre' => 'Membresía: Plan 1',
            'tipo' => 'servicio',
            'precio' => 500,
            'activo' => true,
        ]);

        $plan = MembershipPlan::create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Plan 1',
            'precio' => 500,
            'vigencia_dias' => 30,
            'reinicio_creditos' => 'ninguno',
            'pos_item_id' => $item->id,
            'activo' => true,
        ]);

        MembershipPlanCredit::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'servicio_tipo' => 'hotel',
            'creditos' => 4,
        ]);

        $paymentMethod = PosPaymentMethod::create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Efectivo',
            'activo' => true,
            'orden' => 1,
        ]);

        return compact('tenant', 'user', 'owner', 'pet', 'plan', 'paymentMethod');
    }

    public function test_renewal_reuses_membership_and_resets_credits(): void
    {
        ['user' => $user, 'pet' => $pet, 'plan' => $plan] = $this->makeMembershipContext();

        $this->actingAs($user)->post(route('memberships.assign'), [
            'pet_id' => $pet->id,
            'plan_id' => $plan->id,
            'fecha_inicio' => '2026-07-01',
        ])->assertRedirect();

        $membership = Membership::where('pet_id', $pet->id)->where('plan_id', $plan->id)->firstOrFail();
        $this->assertSame('2026-07-31', $membership->fecha_vencimiento->toDateString());
        $this->assertSame(1, MembershipRenewal::where('membership_id', $membership->id)->count());

        $credit = MembershipCredit::where('membership_id', $membership->id)->where('servicio_tipo', 'hotel')->firstOrFail();
        $credit->update(['saldo_actual' => 1]);

        // Simular que la membresía venció y quedó desactivada por el job nocturno.
        $membership->update(['activa' => false, 'fecha_vencimiento' => '2026-08-05']);

        $this->actingAs($user)->post(route('memberships.assign'), [
            'pet_id' => $pet->id,
            'plan_id' => $plan->id,
            'fecha_inicio' => '2026-08-20',
        ])->assertRedirect();

        // Debe seguir siendo la misma fila (no se crea una segunda membresía).
        $this->assertSame(1, Membership::where('pet_id', $pet->id)->where('plan_id', $plan->id)->count());

        $membership->refresh();
        $this->assertTrue($membership->activa);
        $this->assertSame('2026-09-19', $membership->fecha_vencimiento->toDateString());
        $this->assertSame(2, MembershipRenewal::where('membership_id', $membership->id)->count());

        $credit->refresh();
        $this->assertSame(4, $credit->saldo_actual);
    }

    public function test_full_refund_reverses_latest_renewal(): void
    {
        ['tenant' => $tenant, 'user' => $user, 'pet' => $pet, 'plan' => $plan, 'paymentMethod' => $paymentMethod] = $this->makeMembershipContext();

        PosShift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'fecha_apertura' => now(),
            'fondo_inicial' => 0,
            'estado' => 'abierto',
        ]);

        $this->actingAs($user)->post(route('memberships.assign'), [
            'pet_id' => $pet->id,
            'plan_id' => $plan->id,
            'fecha_inicio' => '2026-08-01',
        ])->assertRedirect();

        $membership = Membership::where('pet_id', $pet->id)->where('plan_id', $plan->id)->firstOrFail();
        $renewal = MembershipRenewal::where('membership_id', $membership->id)->firstOrFail();
        $ticket = PosTicket::findOrFail($renewal->pos_ticket_id);

        $this->actingAs($user)->postJson(route('pos.tickets.pay', $ticket), [
            'payments' => [['payment_method_id' => $paymentMethod->id, 'monto' => $ticket->total]],
        ])->assertOk();

        $this->actingAs($user)->post(route('pos.tickets.refund', $ticket), [
            'monto' => $ticket->total,
            'payment_method_id' => $paymentMethod->id,
            'motivo' => 'Cliente se arrepintió',
        ])->assertRedirect();

        $membership->refresh();
        $renewal->refresh();
        $credit = MembershipCredit::where('membership_id', $membership->id)->where('servicio_tipo', 'hotel')->firstOrFail();

        $this->assertTrue($renewal->reembolsada);
        $this->assertSame('2026-08-01', $membership->fecha_vencimiento->toDateString());
        $this->assertFalse($membership->activa);
        $this->assertSame(0, $credit->saldo_actual);
    }

    public function test_partial_refund_does_not_touch_membership(): void
    {
        ['tenant' => $tenant, 'user' => $user, 'pet' => $pet, 'plan' => $plan, 'paymentMethod' => $paymentMethod] = $this->makeMembershipContext();

        PosShift::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'fecha_apertura' => now(),
            'fondo_inicial' => 0,
            'estado' => 'abierto',
        ]);

        $this->actingAs($user)->post(route('memberships.assign'), [
            'pet_id' => $pet->id,
            'plan_id' => $plan->id,
            'fecha_inicio' => '2026-08-01',
        ])->assertRedirect();

        $membership = Membership::where('pet_id', $pet->id)->where('plan_id', $plan->id)->firstOrFail();
        $renewal = MembershipRenewal::where('membership_id', $membership->id)->firstOrFail();
        $ticket = PosTicket::findOrFail($renewal->pos_ticket_id);
        $fechaVencimientoOriginal = $membership->fecha_vencimiento->toDateString();

        $this->actingAs($user)->postJson(route('pos.tickets.pay', $ticket), [
            'payments' => [['payment_method_id' => $paymentMethod->id, 'monto' => $ticket->total]],
        ])->assertOk();

        $this->actingAs($user)->post(route('pos.tickets.refund', $ticket), [
            'monto' => 100,
            'payment_method_id' => $paymentMethod->id,
            'motivo' => 'Reembolso parcial',
        ])->assertRedirect();

        $membership->refresh();
        $renewal->refresh();

        $this->assertFalse($renewal->reembolsada);
        $this->assertTrue($membership->activa);
        $this->assertSame($fechaVencimientoOriginal, $membership->fecha_vencimiento->toDateString());
    }
}
