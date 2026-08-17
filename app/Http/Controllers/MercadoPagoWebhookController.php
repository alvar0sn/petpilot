<?php

namespace App\Http\Controllers;

use App\Models\MpWebhookLog;
use App\Models\PaymentRequest;
use App\Models\PosTicket;
use App\Models\TenantMercadoPagoConfig;
use App\Services\GhlService;
use App\Services\MercadoPagoService;
use App\Services\PaymentRequestService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MercadoPagoWebhookController extends Controller
{
    public function __construct(
        private MercadoPagoService $mercadoPago,
        private PaymentRequestService $paymentRequestService,
        private GhlService $ghl,
    ) {
    }

    public function handle(Request $request, string $token): Response
    {
        // El body JSON (webhooks v2) trae data.id anidado — Request::input() sí
        // soporta dot-notation ahí. La query string clásica (?data.id=X) llega
        // como "data_id" porque PHP convierte los puntos de nombres de query
        // params a guiones bajos al parsear $_GET.
        $mpPaymentId = $request->input('data.id')
            ?? $request->query('data_id')
            ?? $request->input('id')
            ?? $request->query('id');
        $topic = $request->input('type') ?? $request->query('type') ?? $request->query('topic');

        $paymentRequest = PaymentRequest::withoutGlobalScopes()->where('token', $token)->first();

        $log = MpWebhookLog::withoutGlobalScopes()->create([
            'tenant_id' => $paymentRequest?->tenant_id,
            'payment_request_id' => $paymentRequest?->id,
            'mp_payment_id' => $mpPaymentId,
            'topic' => $topic,
            'raw_payload' => $request->all(),
            'status' => 'procesado',
        ]);

        if (! $paymentRequest || ! $mpPaymentId) {
            $log->update(['status' => 'ignorado', 'error_message' => 'Token de solicitud o data.id ausente/no encontrado.']);
            return response()->noContent();
        }

        $config = TenantMercadoPagoConfig::where('tenant_id', $paymentRequest->tenant_id)->first();

        if (! $config || ! $config->access_token) {
            $log->update(['status' => 'error', 'error_message' => 'El negocio no tiene Mercado Pago configurado.']);
            return response()->noContent();
        }

        if ($config->webhook_secret) {
            $signatureValid = $this->mercadoPago->validateSignature($request, $config->webhook_secret, (string) $mpPaymentId);
            $log->update(['signature_valid' => $signatureValid]);

            if (! $signatureValid) {
                $log->update(['status' => 'error', 'error_message' => 'Firma x-signature inválida.']);
                return response()->noContent();
            }
        }

        if (! $paymentRequest->isPending()) {
            $log->update(['status' => 'ignorado', 'error_message' => 'La solicitud ya no está pendiente (idempotencia).']);
            return response()->noContent();
        }

        // Nunca se confía en el monto/estado del body del webhook — se re-consulta
        // el pago directo contra la API de Mercado Pago con el token del tenant.
        $payment = $this->mercadoPago->fetchPayment($config->access_token, (string) $mpPaymentId);

        if (! $payment) {
            $log->update(['status' => 'error', 'error_message' => 'No se pudo consultar el pago en la API de Mercado Pago.']);
            return response()->noContent();
        }

        $log->update(['raw_payload' => ['notification' => $request->all(), 'mp_payment' => $payment]]);

        if (($payment['external_reference'] ?? null) !== $paymentRequest->external_reference) {
            $log->update(['status' => 'error', 'error_message' => 'external_reference no coincide con la solicitud.']);
            return response()->noContent();
        }

        if (($payment['status'] ?? null) !== 'approved') {
            $paymentRequest->update(['raw_last_status' => $payment]);
            $log->update(['status' => 'procesado', 'error_message' => 'Estado del pago: ' . ($payment['status'] ?? 'desconocido')]);
            return response()->noContent();
        }

        $this->paymentRequestService->confirmApproved($paymentRequest, (string) $mpPaymentId);

        $ticket = PosTicket::withoutGlobalScopes()->find($paymentRequest->pos_ticket_id);
        if ($ticket) {
            $ticket->loadMissing('owner:id,nombre,apellidos,telefono,email,ghl_contact_id', 'lines');
            $this->ghl->notifyTicketPaid($ticket);
        }

        $log->update(['status' => 'procesado']);

        return response()->noContent();
    }
}
