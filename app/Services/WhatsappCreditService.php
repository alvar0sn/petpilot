<?php

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\WhatsappCreditMovement;
use Illuminate\Support\Facades\DB;

class WhatsappCreditService
{
    public static function hasCredits(Tenant $tenant): bool
    {
        return ($tenant->whatsapp_free_credits + $tenant->whatsapp_purchased_credits) > 0;
    }

    /**
     * Descuenta 1 crédito por un mensaje que el gateway confirmó como
     * enviado — gratis primero, comprado después. Idempotente por
     * external_reference: un reintento del webhook de estado no debe
     * descontar dos veces.
     */
    public static function consume(Tenant $tenant, ?string $externalReference): void
    {
        DB::transaction(function () use ($tenant, $externalReference) {
            $locked = Tenant::whereKey($tenant->id)->lockForUpdate()->first();

            if ($externalReference && WhatsappCreditMovement::withoutGlobalScopes()
                ->where('tenant_id', $locked->id)
                ->where('external_reference', $externalReference)
                ->exists()) {
                return;
            }

            $source = $locked->whatsapp_free_credits > 0 ? 'free' : 'purchased';
            $locked->decrement($source === 'free' ? 'whatsapp_free_credits' : 'whatsapp_purchased_credits');

            WhatsappCreditMovement::withoutGlobalScopes()->create([
                'tenant_id' => $locked->id,
                'type' => 'consumption',
                'credits' => -1,
                'source' => $source,
                'external_reference' => $externalReference,
            ]);
        });
    }

    /**
     * Acredita una recarga pagada por MercadoPago. Idempotente por
     * mp_payment_id — la notificación de MP puede llegar más de una vez.
     */
    public static function addPurchased(Tenant $tenant, int $credits, string $mpPaymentId): bool
    {
        if (WhatsappCreditMovement::withoutGlobalScopes()->where('mp_payment_id', $mpPaymentId)->exists()) {
            return false;
        }

        DB::transaction(function () use ($tenant, $credits, $mpPaymentId) {
            $tenant->increment('whatsapp_purchased_credits', $credits);

            WhatsappCreditMovement::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'type' => 'purchase',
                'credits' => $credits,
                'mp_payment_id' => $mpPaymentId,
            ]);
        });

        return true;
    }

    /**
     * Reinicia los créditos gratis en el aniversario de alta del tenant —
     * lo que sobraba del ciclo anterior se pierde, solo los comprados
     * persisten.
     */
    public static function resetFree(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant) {
            // Si el reset se quedó atrás más de un ciclo (ej. el job no corrió
            // por un tiempo), avanzar un solo mes no basta para dejarlo en el
            // futuro — el job lo volvería a seleccionar mañana y regalaría
            // créditos de más cada día hasta alcanzarlo. Adelanta hasta que
            // quede después de hoy, pero solo otorga una vez.
            $nextReset = $tenant->whatsapp_credits_reset_at->copy();
            while ($nextReset->lte(today())) {
                $nextReset = $nextReset->addMonthNoOverflow();
            }
            $grant = $tenant->whatsapp_free_credits_monthly ?? (int) SystemSetting::get('whatsapp_free_credits_default', 1000);

            $tenant->update([
                'whatsapp_free_credits' => $grant,
                'whatsapp_credits_reset_at' => $nextReset,
            ]);

            WhatsappCreditMovement::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'type' => 'free_grant',
                'credits' => $grant,
                'source' => 'free',
            ]);
        });
    }

    /**
     * Ajuste puntual (cortesía, corrección de un error) hecho por el
     * super-admin — no confundir con resetFree(), que es el otorgamiento
     * mensual automático. Queda registrado como movimiento aparte.
     */
    public static function adjustFree(Tenant $tenant, int $delta): void
    {
        DB::transaction(function () use ($tenant, $delta) {
            $locked = Tenant::whereKey($tenant->id)->lockForUpdate()->first();

            if ($locked->whatsapp_free_credits + $delta < 0) {
                throw new \InvalidArgumentException('El ajuste dejaría créditos gratis negativos.');
            }

            $locked->increment('whatsapp_free_credits', $delta);

            WhatsappCreditMovement::withoutGlobalScopes()->create([
                'tenant_id' => $locked->id,
                'type' => 'manual_adjustment',
                'credits' => $delta,
                'source' => 'free',
            ]);
        });
    }
}
