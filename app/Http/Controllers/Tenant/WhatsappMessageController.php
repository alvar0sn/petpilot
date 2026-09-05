<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\WhatsappCreditMovement;
use App\Services\WhatsappCreditCheckout;
use App\Services\WhatsappGatewayService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappMessageController extends Controller
{
    public function index(): Response
    {
        $tenant = app('current_tenant');
        $triggers = $this->buildTriggerRows($tenant);
        $accountStatus = WhatsappGatewayService::fetchAccountStatus($tenant);

        return Inertia::render('Settings/WhatsappMessages/Index', [
            'triggers' => $triggers->values(),
            'whatsappEnabled' => (bool) $tenant->getSetting('whatsapp.enabled'),
            'accountStatus' => $accountStatus,
            'credits' => [
                'free' => $tenant->whatsapp_free_credits,
                'purchased' => $tenant->whatsapp_purchased_credits,
            ],
            'creditMovements' => WhatsappCreditMovement::latest()->paginate(15),
        ]);
    }

    public function rechargeCredits(WhatsappCreditCheckout $checkout)
    {
        $tenant = app('current_tenant');
        $preference = $checkout->createPreference($tenant);

        if (isset($preference['error'])) {
            return back()->with('error', 'No se pudo iniciar la recarga — intenta de nuevo en un momento.');
        }

        return redirect()->away($preference['init_point']);
    }

    public function edit(string $trigger): Response|\Illuminate\Http\RedirectResponse
    {
        $catalog = config('whatsapp_triggers');

        abort_unless(isset($catalog[$trigger]), 404);

        $tenant = app('current_tenant');

        if (!$this->hasOwnWhatsapp($tenant)) {
            return redirect()->route('whatsapp.index')
                ->with('error', 'Necesitas tu propio número de WhatsApp conectado para poder editar mensajes — mientras uses el número compartido, siempre se manda el mensaje genérico del catálogo.');
        }

        $row = $this->buildTriggerRows($tenant)->get($trigger);

        return Inertia::render('Settings/WhatsappMessages/Edit', [
            'trigger' => $row,
        ]);
    }

    /**
     * Sin WABA propia conectada, la plantilla que el dueño guarde aquí jamás
     * se somete a Meta ni se usa (siempre se manda por la cuenta pool con la
     * plantilla compartida del operador) — dejar editar le da una falsa
     * sensación de que personalizó su mensaje.
     */
    private function hasOwnWhatsapp($tenant): bool
    {
        return (bool) (WhatsappGatewayService::fetchAccountStatus($tenant)['own_connected'] ?? false);
    }

    public function update(Request $request)
    {
        $tenant = app('current_tenant');

        if (!$this->hasOwnWhatsapp($tenant)) {
            return redirect()->route('whatsapp.index')
                ->with('error', 'Necesitas tu propio número de WhatsApp conectado para poder editar mensajes.');
        }

        $validated = $request->validate([
            'trigger' => ['required', 'string'],
            'body' => ['required', 'string', function ($attribute, $value, $fail) {
                if (self::hasVariableAtBoundary($value)) {
                    $fail('Las variables no pueden estar al principio ni al final de la plantilla.');
                }
            }],
            'days_before' => ['nullable', 'integer', 'min:0', 'max:30'],
            'variable_order' => ['nullable', 'string'],
        ]);

        $catalog = config('whatsapp_triggers');

        abort_unless(isset($catalog[$validated['trigger']]), 404);

        $availableKeys = array_keys($catalog[$validated['trigger']]['variables']);
        $order = json_decode($validated['variable_order'] ?? '', true);
        $variableOrder = (is_array($order) && $order === array_values(array_intersect($order, $availableKeys)))
            ? array_values(array_unique($order))
            : null;

        $saved = WhatsappGatewayService::saveTemplate(
            $tenant,
            $validated['trigger'],
            $validated['body'],
            $catalog[$validated['trigger']]['category'],
            $variableOrder
        );

        if (!$saved) {
            return back()->with('error', 'No se pudo guardar el mensaje — intenta de nuevo en un momento.');
        }

        if ($catalog[$validated['trigger']]['has_days_before'] ?? false) {
            $tenant->setSetting("whatsapp.triggers.{$validated['trigger']}.days_before", $validated['days_before'] ?? 0);
        }

        return redirect()->route('whatsapp.index')->with('success', 'Mensaje guardado.');
    }

    /**
     * Meta rechaza una plantilla si {{N}} queda pegado al inicio o al final
     * (sin texto real antes/después) — lo validamos aquí para no gastar un
     * intento de sometimiento fallido.
     */
    private static function hasVariableAtBoundary(string $body): bool
    {
        $trimmed = trim($body);

        if (preg_match('/^\{\{\d+\}\}/', $trimmed)) {
            return true;
        }

        // Ojo: NO usar rtrim con un charset que incluya "}" — se comería las
        // llaves de cierre del propio {{N}} y el chequeo nunca detectaría nada.
        return (bool) preg_match('/\{\{\d+\}\}[\s.,!?¡¿:;)\]}"\']*$/', $trimmed);
    }

    public function toggle(Request $request, string $trigger)
    {
        $catalog = config('whatsapp_triggers');

        abort_unless(isset($catalog[$trigger]), 404);

        $tenant = app('current_tenant');
        $current = $tenant->getSetting("whatsapp.triggers.{$trigger}.enabled") ?? true;
        $tenant->setSetting("whatsapp.triggers.{$trigger}.enabled", !$current);

        return back();
    }

    private function buildTriggerRows($tenant)
    {
        $catalog = config('whatsapp_triggers');
        $fetched = WhatsappGatewayService::fetchTemplates($tenant);

        return collect($catalog)->map(function (array $definition, string $key) use ($fetched, $tenant) {
            $own = collect($fetched)->first(fn ($row) => $row['template_name'] === $key && !$row['shared']);
            $shared = collect($fetched)->first(fn ($row) => $row['template_name'] === $key && $row['shared']);
            $current = $own ?? $shared;

            $currentBody = $current['body'] ?? null;

            return array_merge($definition, [
                'key' => $key,
                'body' => $currentBody ?: ($definition['default_body'] ?? ''),
                'is_placeholder' => empty($currentBody),
                'status' => $current['status'] ?? 'not_submitted',
                'rejected_reason' => $current['rejected_reason'] ?? null,
                'updated_at' => $current['updated_at'] ?? null,
                'is_own' => (bool) $own,
                'enabled' => $tenant->getSetting("whatsapp.triggers.{$key}.enabled") ?? true,
                'days_before' => $tenant->getSetting("whatsapp.triggers.{$key}.days_before") ?? 3,
                'variable_order' => $current['variable_order'] ?? array_keys($definition['variables']),
            ]);
        });
    }
}
