<?php

namespace App\Http\Controllers;

use App\Models\PosTicket;
use App\Models\PosTicketConfig;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicTicketController extends Controller
{
    public function show(string $token): Response
    {
        $ticket = PosTicket::withoutGlobalScopes()
            ->where('token', $token)
            ->with(['lines', 'owner:id,nombre,apellidos'])
            ->firstOrFail();

        $config = PosTicketConfig::withoutGlobalScopes()
            ->where('tenant_id', $ticket->tenant_id)
            ->first();

        return Inertia::render('Ticket/Public', [
            'ticket' => [
                'folio'           => $ticket->folio,
                'estado'          => $ticket->estado,
                'owner'           => $ticket->owner
                    ? trim("{$ticket->owner->nombre} {$ticket->owner->apellidos}")
                    : null,
                'lines'           => $ticket->lines->map(fn($l) => [
                    'nombre'   => $l->nombre_snapshot,
                    'cantidad' => $l->cantidad,
                    'precio'   => $l->precio_snapshot,
                    'subtotal' => $l->subtotal,
                ]),
                'subtotal'        => $ticket->subtotal,
                'discount_amount' => $ticket->discount_amount,
                'total'           => $ticket->total,
                'cobrado_at'      => $ticket->cobrado_at?->toDateTimeString(),
            ],
            'config' => [
                'logo_url'       => $config?->logo_path
                    ? Storage::url($config->logo_path)
                    : null,
                'color_primario' => $config?->color_primario ?? '#4f46e5',
                'color_texto'    => $config?->color_texto    ?? '#1f2937',
                'color_fondo'    => $config?->color_fondo    ?? '#ffffff',
                'mensaje_pie'    => $config?->mensaje_pie,
            ],
        ]);
    }
}
