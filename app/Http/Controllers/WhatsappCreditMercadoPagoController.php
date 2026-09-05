<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\MercadoPagoService;
use App\Services\WhatsappCreditCheckout;
use App\Services\WhatsappCreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsappCreditMercadoPagoController extends Controller
{
    public function __construct(
        private WhatsappCreditCheckout $checkout,
        private MercadoPagoService $mercadoPago,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $type = $request->input('type') ?? $request->input('topic');
        $paymentId = $request->input('data.id') ?? $request->input('id');

        if ($type !== 'payment' || !$paymentId) {
            return response()->json(['ok' => true]);
        }

        $webhookSecret = config('services.whatsapp_credits.mp_webhook_secret');
        if ($webhookSecret && !$this->mercadoPago->validateSignature($request, $webhookSecret, (string) $paymentId)) {
            Log::warning('WhatsApp credits MP webhook: firma inválida', ['payment_id' => $paymentId]);
            return response()->json(['error' => 'invalid signature'], 403);
        }

        $payment = $this->checkout->verifyPayment((string) $paymentId);

        if (!$payment || ($payment['status'] ?? null) !== 'approved') {
            return response()->json(['ok' => true]);
        }

        $externalRef = $payment['external_reference'] ?? '';
        $parts = explode('|', $externalRef);

        if (count($parts) !== 3 || $parts[0] !== 'credits') {
            Log::warning('WhatsApp credits MP webhook: external_reference inválida', ['ref' => $externalRef]);
            return response()->json(['error' => 'invalid reference'], 400);
        }

        $tenant = Tenant::find((int) $parts[1]);
        if (!$tenant) {
            return response()->json(['error' => 'tenant not found'], 404);
        }

        $creditsPerMxn = WhatsappCreditCheckout::creditsPerPack() / WhatsappCreditCheckout::pricePerPack();
        $credits = (int) round(($payment['transaction_amount'] ?? 0) * $creditsPerMxn);

        if ($credits > 0) {
            WhatsappCreditService::addPurchased($tenant, $credits, (string) $paymentId);
        }

        return response()->json(['ok' => true]);
    }
}
