<?php

namespace App\Services;

use App\Jobs\SendWhatsappGatewayMessage;
use App\Models\Owner;
use App\Models\Tenant;
use App\Models\WhatsappGatewayLog;
use Illuminate\Support\Facades\Http;
use Throwable;

class WhatsappGatewayService
{
    /**
     * Encola un mensaje para un disparador del catálogo — retorna inmediatamente.
     *
     * $context trae los valores de las variables del disparador que no vienen
     * directo del Owner (name/full_name/phone se resuelven solos).
     */
    public static function send(Tenant $tenant, string $trigger, Owner $owner, array $context = [], ?string $externalReference = null): void
    {
        if (!$tenant->getSetting('whatsapp.enabled')) {
            return;
        }

        if (!($tenant->getSetting("whatsapp.triggers.{$trigger}.enabled") ?? true)) {
            return;
        }

        if (!WhatsappCreditService::hasCredits($tenant)) {
            return;
        }

        $variables = config("whatsapp_triggers.{$trigger}.variables");
        if (!$variables) {
            return;
        }

        $phone = self::normalizePhone($owner->telefono);
        if (!$phone) {
            return;
        }

        $context = array_merge([
            'business_name' => $tenant->nombre,
            'business_phone' => $tenant->getSetting('whatsapp.business_phone') ?? '',
            'slug' => $tenant->slug,
        ], $context);

        $current = self::resolveCurrentTemplate($tenant, $trigger);
        $order = $current['variable_order'] ?? array_keys($variables);

        $params = array_map(
            fn (string $key) => self::resolveVariable($key, $owner, $context),
            $order
        );

        $payload = [
            'external_tenant_id' => (string) $tenant->id,
            'to' => $phone,
            'template' => $trigger,
            'params' => $params,
            'external_reference' => $externalReference,
        ];

        $log = WhatsappGatewayLog::create([
            'tenant_id' => $tenant->id,
            'event'     => "whatsapp_{$trigger}",
            'payload'   => $payload,
            'url'       => self::sendUrl(),
            'status'    => 'pending',
        ]);

        SendWhatsappGatewayMessage::dispatch($log->id);
    }

    /**
     * Trae las plantillas (propias + compartidas) de este tenant. Retorna un
     * arreglo vacío si el gateway no responde — quien llame debe poder seguir
     * funcionando sin esta información (no es crítico).
     */
    public static function fetchTemplates(Tenant $tenant): array
    {
        try {
            $response = Http::withToken(config('services.whatsapp_gateway.token'))
                ->timeout(10)
                ->get(self::templatesUrl(), ['external_tenant_id' => (string) $tenant->id]);

            return $response->successful() ? $response->json('data', []) : [];
        } catch (Throwable $e) {
            return [];
        }
    }

    public static function saveTemplate(Tenant $tenant, string $templateName, string $body, string $category, ?array $variableOrder = null, string $language = 'es'): bool
    {
        try {
            $response = Http::withToken(config('services.whatsapp_gateway.token'))
                ->timeout(10)
                ->post(self::templatesUrl(), [
                    'external_tenant_id' => (string) $tenant->id,
                    'template_name' => $templateName,
                    'language' => $language,
                    'category' => $category,
                    'body' => $body,
                    'variable_order' => $variableOrder,
                ]);

            return $response->successful();
        } catch (Throwable $e) {
            return false;
        }
    }

    /**
     * De las plantillas de este tenant, la que realmente se va a usar para
     * este disparador — propia si tiene, si no la compartida.
     */
    private static function resolveCurrentTemplate(Tenant $tenant, string $trigger): ?array
    {
        $fetched = collect(self::fetchTemplates($tenant));
        $own = $fetched->first(fn ($row) => $row['template_name'] === $trigger && !$row['shared']);
        $shared = $fetched->first(fn ($row) => $row['template_name'] === $trigger && $row['shared']);

        return $own ?? $shared;
    }

    /**
     * Si el tenant ya tiene su propia WABA conectada en el gateway — el panel
     * lo usa para bloquear la edición de mensajes mientras use el número
     * pool compartido (esa plantilla nunca se usa, solo la del operador).
     * Retorna un default seguro (nada conectado) si el gateway no responde.
     */
    public static function fetchAccountStatus(Tenant $tenant): array
    {
        try {
            $response = Http::withToken(config('services.whatsapp_gateway.token'))
                ->timeout(10)
                ->get(self::accountStatusUrl(), ['external_tenant_id' => (string) $tenant->id]);

            $data = $response->successful() ? $response->json() : null;

            return is_array($data) ? array_merge(self::defaultAccountStatus(), $data) : self::defaultAccountStatus();
        } catch (Throwable $e) {
            return self::defaultAccountStatus();
        }
    }

    private static function defaultAccountStatus(): array
    {
        return [
            'has_own_account' => false,
            'own_connected' => false,
            'display_phone_number' => null,
            'has_active_account' => false,
            'using_pool' => false,
        ];
    }

    /**
     * Números de la cuenta de YCloud del gateway que un super-admin conectó
     * a mano y todavía no están asignados a ningún tenant — para el selector
     * de "conectar número" en el super-admin. Vacío si el gateway no responde.
     */
    public static function fetchAvailableNumbers(): array
    {
        try {
            $response = Http::withToken(config('services.whatsapp_gateway.token'))
                ->timeout(10)
                ->get(self::baseUrl().'/available-numbers');

            return $response->successful() ? $response->json('data', []) : [];
        } catch (Throwable $e) {
            return [];
        }
    }

    /**
     * Liga un número ya conectado en YCloud (pero sin tenant asignado) a
     * este tenant como su WABA propia.
     *
     * @return array{ok: bool, error?: string}
     */
    public static function connectOwnNumber(Tenant $tenant, string $phoneNumberId, string $wabaId): array
    {
        try {
            $response = Http::withToken(config('services.whatsapp_gateway.token'))
                ->timeout(10)
                ->post(self::baseUrl().'/connect-number', [
                    'external_tenant_id' => (string) $tenant->id,
                    'phone_number_id' => $phoneNumberId,
                    'waba_id' => $wabaId,
                ]);

            if ($response->successful()) {
                return ['ok' => true];
            }

            return ['ok' => false, 'error' => $response->json('error', 'No se pudo conectar el número.')];
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => 'Error de conexión con el gateway.'];
        }
    }

    private static function sendUrl(): string
    {
        return self::baseUrl().'/send';
    }

    private static function templatesUrl(): string
    {
        return self::baseUrl().'/templates';
    }

    private static function accountStatusUrl(): string
    {
        return self::baseUrl().'/account-status';
    }

    private static function baseUrl(): string
    {
        $base = rtrim(config('services.whatsapp_gateway.url'), '/');
        $appId = config('services.whatsapp_gateway.app_id');

        return "{$base}/api/webhooks/{$appId}";
    }

    private static function resolveVariable(string $key, Owner $owner, array $context): string
    {
        return match ($key) {
            'name' => $owner->nombre ?? '',
            'full_name' => $owner->nombre_completo ?? '',
            'phone' => $owner->telefono ?? '',
            default => (string) ($context[$key] ?? ''),
        };
    }

    private static function normalizePhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone);

        if (!$digits) {
            return null;
        }

        if (strlen($digits) === 10) {
            $digits = '52'.$digits;
        }

        return '+'.$digits;
    }
}
