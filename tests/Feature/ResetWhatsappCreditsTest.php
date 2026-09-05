<?php

namespace Tests\Feature;

use App\Jobs\ResetWhatsappCredits;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResetWhatsappCreditsTest extends TestCase
{
    use RefreshDatabase;

    public function test_solo_reinicia_tenants_cuyo_reset_ya_llego(): void
    {
        $vencido = Tenant::create([
            'nombre' => 'Vencido', 'slug' => 'vencido-' . uniqid(),
            'whatsapp_free_credits' => 3, 'whatsapp_credits_reset_at' => today(),
        ]);
        $futuro = Tenant::create([
            'nombre' => 'Futuro', 'slug' => 'futuro-' . uniqid(),
            'whatsapp_free_credits' => 3, 'whatsapp_credits_reset_at' => today()->addDays(5),
        ]);

        (new ResetWhatsappCredits())->handle();

        $this->assertSame(1000, $vencido->fresh()->whatsapp_free_credits);
        $this->assertSame(3, $futuro->fresh()->whatsapp_free_credits);
    }
}
