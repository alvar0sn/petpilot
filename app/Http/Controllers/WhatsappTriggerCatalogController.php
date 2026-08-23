<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsappTriggerCatalogController extends Controller
{
    /**
     * Expone el catálogo de disparadores de WhatsApp para que el operador del
     * gateway pueda elegir un nombre válido al crear una plantilla compartida,
     * en vez de escribirlo a mano y arriesgarse a que nunca se use.
     */
    public function index(Request $request): JsonResponse
    {
        $expected = config('services.whatsapp_gateway.inbound_secret');
        $given = $request->header('X-Gateway-Secret');

        if (!$expected || !$given || !hash_equals($expected, $given)) {
            abort(403);
        }

        $catalog = collect(config('whatsapp_triggers'))->map(fn (array $definition, string $key) => [
            'label' => $definition['label'],
            'category' => $definition['category'],
        ]);

        return response()->json($catalog);
    }
}
