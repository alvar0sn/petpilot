<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MercadoPagoService
{
    private const API_BASE = 'https://api.mercadopago.com';

    public function createPreference(string $accessToken, array $params): array
    {
        $response = $this->http($accessToken)->post(self::API_BASE . '/checkout/preferences', [
            'items' => [[
                'title' => $params['descripcion'],
                'quantity' => 1,
                'unit_price' => (float) $params['monto'],
                'currency_id' => $params['currency_id'] ?? 'MXN',
            ]],
            'external_reference' => $params['external_reference'],
            'notification_url' => $params['notification_url'],
            'back_urls' => [
                'success' => $params['back_url'],
                'pending' => $params['back_url'],
                'failure' => $params['back_url'],
            ],
            'auto_return' => 'approved',
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Mercado Pago rechazó la creación de la preferencia: ' . $response->body());
        }

        return [
            'preference_id' => $response->json('id'),
            'init_point' => $response->json('init_point'),
        ];
    }

    public function fetchPayment(string $accessToken, string $mpPaymentId): ?array
    {
        $response = $this->http($accessToken)->get(self::API_BASE . "/v1/payments/{$mpPaymentId}");

        if (! $response->successful()) {
            return null;
        }

        return $response->json();
    }

    public function testConnection(string $accessToken): bool
    {
        return $this->http($accessToken)->get(self::API_BASE . '/users/me')->successful();
    }

    /**
     * Valida la firma x-signature que Mercado Pago manda en cada notificación de webhook.
     * @see https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/notifications/webhooks
     */
    public function validateSignature(Request $request, string $webhookSecret, string $mpPaymentId): bool
    {
        $signatureHeader = $request->header('x-signature');
        $requestId = $request->header('x-request-id');

        if (! $signatureHeader || ! $requestId) {
            return false;
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $piece) {
            [$key, $value] = array_pad(explode('=', trim($piece), 2), 2, null);
            if ($key !== null && $value !== null) {
                $parts[trim($key)] = trim($value);
            }
        }

        $ts = $parts['ts'] ?? null;
        $v1 = $parts['v1'] ?? null;

        if (! $ts || ! $v1) {
            return false;
        }

        $manifest = "id:{$mpPaymentId};request-id:{$requestId};ts:{$ts};";
        $expected = hash_hmac('sha256', $manifest, $webhookSecret);

        return hash_equals($expected, $v1);
    }

    private function http(string $accessToken): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withToken($accessToken)->acceptJson();
    }
}
