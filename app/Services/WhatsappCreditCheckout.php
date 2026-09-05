<?php

namespace App\Services;

use App\Models\SystemSetting;
use App\Models\Tenant;
use Illuminate\Support\Str;

/**
 * Checkout de recarga de créditos de WhatsApp — a diferencia de
 * PaymentRequestService (que cobra a nombre del TENANT, a sus dueños de
 * mascota), este usa la cuenta de MercadoPago de la plataforma: es vetrkt
 * cobrándole al tenant.
 */
class WhatsappCreditCheckout
{
    public function __construct(private MercadoPagoService $mercadoPago) {}

    public static function creditsPerPack(): int
    {
        return (int) SystemSetting::get('whatsapp_recharge_credits', 200);
    }

    public static function pricePerPack(): float
    {
        return (float) SystemSetting::get('whatsapp_recharge_price', 100.0);
    }

    public function createPreference(Tenant $tenant): array
    {
        $accessToken = config('services.whatsapp_credits.mp_access_token');
        if (!$accessToken) {
            return ['error' => 'No hay credenciales de Mercado Pago configuradas para créditos de WhatsApp.'];
        }

        $externalRef = "credits|{$tenant->id}|" . Str::uuid();

        try {
            $preference = $this->mercadoPago->createPreference($accessToken, [
                'descripcion' => self::creditsPerPack() . ' créditos de WhatsApp — ' . $tenant->nombre,
                'monto' => self::pricePerPack(),
                'currency_id' => 'MXN',
                'external_reference' => $externalRef,
                'notification_url' => route('webhooks.whatsapp-credits.mercadopago'),
                'back_url' => route('whatsapp.index'),
            ]);
        } catch (\RuntimeException $e) {
            return ['error' => $e->getMessage()];
        }

        return ['init_point' => $preference['init_point']];
    }

    public function verifyPayment(string $paymentId): ?array
    {
        $accessToken = config('services.whatsapp_credits.mp_access_token');
        if (!$accessToken) {
            return null;
        }

        return $this->mercadoPago->fetchPayment($accessToken, $paymentId);
    }
}
