<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\WhatsappCreditService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WhatsappGatewayStatusController extends Controller
{
    /**
     * Recibe el relay de "message.status" que manda whatsapp-gateway cuando
     * un mensaje quedó realmente enviado o falló — solo un 'sent' consume
     * crédito, un 'failed' no cobra nada.
     */
    public function receive(Request $request): Response
    {
        $secret = config('services.whatsapp_gateway.inbound_secret');
        $signature = $request->header('X-Gateway-Signature', '');
        $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), (string) $secret);

        abort_unless($secret && hash_equals($expected, $signature), 403, 'Firma de webhook inválida.');

        $payload = $request->json()->all();

        if (($payload['event'] ?? null) !== 'message.status' || ($payload['status'] ?? null) !== 'sent') {
            return response('', 204);
        }

        $tenant = Tenant::find((int) ($payload['external_tenant_id'] ?? 0));

        if ($tenant) {
            WhatsappCreditService::consume($tenant, $payload['external_reference'] ?? null);
        }

        return response('', 200);
    }
}
