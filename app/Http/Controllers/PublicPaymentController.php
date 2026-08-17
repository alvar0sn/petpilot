<?php

namespace App\Http\Controllers;

use App\Models\PaymentRequest;
use App\Models\PosTicketConfig;
use App\Models\Tenant;
use Inertia\Inertia;
use Inertia\Response;

class PublicPaymentController extends Controller
{
    public function show(string $token): Response
    {
        $paymentRequest = PaymentRequest::withoutGlobalScopes()
            ->where('token', $token)
            ->with(['ticket.lines', 'ticket.owner:id,nombre,apellidos'])
            ->firstOrFail();

        $tenant = Tenant::find($paymentRequest->tenant_id);

        $config = PosTicketConfig::withoutGlobalScopes()
            ->where('tenant_id', $paymentRequest->tenant_id)
            ->first();

        return Inertia::render('Public/Pago', [
            'negocio' => [
                'nombre' => $tenant?->nombre,
                'logo_url' => media_url($config?->logo_path),
                'color_primario' => $config?->color_primario ?? '#4f46e5',
                'color_texto' => $config?->color_texto ?? '#1f2937',
                'color_fondo' => $config?->color_fondo ?? '#ffffff',
            ],
            'solicitud' => [
                'estado' => $paymentRequest->estado,
                'monto' => $paymentRequest->monto,
                'notas' => $paymentRequest->notas,
                'init_point' => $paymentRequest->mp_init_point,
                'folio' => $paymentRequest->ticket?->folio,
                'owner' => $paymentRequest->ticket?->owner
                    ? trim("{$paymentRequest->ticket->owner->nombre} {$paymentRequest->ticket->owner->apellidos}")
                    : null,
                'lines' => $paymentRequest->ticket?->lines->map(fn($l) => [
                    'nombre' => $l->nombre_snapshot,
                    'cantidad' => $l->cantidad,
                    'subtotal' => $l->subtotal,
                ])->all() ?? [],
            ],
        ]);
    }
}
