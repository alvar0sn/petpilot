<?php

namespace App\Services;

use App\Models\GhlContactLog;
use App\Models\GhlWebhookLog;
use App\Models\Owner;
use App\Models\TenantGhlConfig;
use Illuminate\Support\Facades\Http;

class GhlService
{
    public function syncContact(int $tenantId, Owner $owner): bool
    {
        $config = TenantGhlConfig::where('tenant_id', $tenantId)
            ->where('activo', true)
            ->first();

        if (! $config || ! $config->api_key || ! $config->location_id) {
            GhlContactLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'owner_id' => $owner->id,
                'action' => 'sync',
                'status' => 'skipped',
                'error_message' => 'GHL no configurado o inactivo',
            ]);
            return false;
        }

        $phone = $owner->telefono ? $this->normalizePhone($owner->telefono) : null;
        $email = $owner->email ?: null;

        if (! $phone && ! $email) {
            GhlContactLog::withoutGlobalScopes()->create([
                'tenant_id'     => $tenantId,
                'owner_id'      => $owner->id,
                'action'        => 'sync',
                'status'        => 'skipped',
                'error_message' => 'Sin teléfono ni email — GHL requiere al menos uno',
            ]);
            return false;
        }

        $payload = array_filter([
            'firstName'  => $owner->nombre,
            'lastName'   => $owner->apellidos ?: null,
            'phone'      => $phone,
            'email'      => $email,
            'locationId' => $config->location_id,
        ], fn($v) => $v !== null && $v !== '');

        try {
            $http = Http::withToken($config->api_key)
                ->withHeaders(['Version' => '2021-07-28']);

            if ($owner->ghl_contact_id) {
                $response = $http->put("https://services.leadconnectorhq.com/contacts/{$owner->ghl_contact_id}", $payload);
                $action = 'update';
            } else {
                $response = $http->post('https://services.leadconnectorhq.com/contacts/', $payload);
                $action = 'create';
            }

            $success = $response->successful();

            // Duplicate: GHL returns 400 with the existing contactId in meta
            if (! $success && $response->status() === 400 && $action === 'create') {
                $existingId = $response->json('meta.contactId');
                if ($existingId) {
                    $owner->withoutGlobalScopes()->where('id', $owner->id)->update([
                        'ghl_contact_id'  => $existingId,
                        'ghl_sync_status' => 'synced',
                    ]);
                    GhlContactLog::withoutGlobalScopes()->create([
                        'tenant_id'      => $tenantId,
                        'owner_id'       => $owner->id,
                        'action'         => 'create',
                        'status'         => 'success',
                        'ghl_contact_id' => $existingId,
                        'http_code'      => $response->status(),
                        'error_message'  => 'Contacto duplicado — vinculado a existente',
                        'payload_sent'   => $payload,
                    ]);
                    return true;
                }
            }

            if ($success && $action === 'create') {
                $owner->withoutGlobalScopes()->where('id', $owner->id)->update([
                    'ghl_contact_id' => $response->json('contact.id'),
                    'ghl_sync_status' => 'synced',
                ]);
            } elseif ($success) {
                $owner->withoutGlobalScopes()->where('id', $owner->id)->update(['ghl_sync_status' => 'synced']);
            } else {
                $owner->withoutGlobalScopes()->where('id', $owner->id)->update(['ghl_sync_status' => 'failed']);
            }

            GhlContactLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'owner_id' => $owner->id,
                'action' => $action,
                'status' => $success ? 'success' : 'failed',
                'ghl_contact_id' => $owner->ghl_contact_id,
                'http_code' => $response->status(),
                'error_message' => $success ? null : $response->body(),
                'payload_sent' => $payload,
            ]);

            return $success;
        } catch (\Throwable $e) {
            $owner->withoutGlobalScopes()->where('id', $owner->id)->update(['ghl_sync_status' => 'failed']);

            GhlContactLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'owner_id' => $owner->id,
                'action' => 'sync',
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'payload_sent' => $payload,
            ]);

            return false;
        }
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (str_starts_with($digits, '521') && strlen($digits) === 13) {
            return '+' . $digits;
        }
        if (str_starts_with($digits, '52') && strlen($digits) === 12) {
            return '+' . $digits;
        }
        if (strlen($digits) === 10) {
            return '+52' . $digits;
        }

        return '+' . $digits;
    }

    public function sendWebhook(int $tenantId, string $type, array $payload): bool
    {
        $config = TenantGhlConfig::where('tenant_id', $tenantId)
            ->where('activo', true)
            ->first();

        if (! $config) return false;

        $webhookField = 'webhook_' . $type;
        $url = $config->$webhookField ?? null;

        if (! $url) return false;

        try {
            $response = Http::post($url, array_merge(['tipo' => $type], $payload));
            $success = $response->successful();

            GhlWebhookLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'webhook_type' => $type,
                'status' => $success ? 'success' : 'failed',
                'http_code' => $response->status(),
                'payload_sent' => $payload,
                'error_message' => $success ? null : $response->body(),
            ]);

            return $success;
        } catch (\Throwable $e) {
            GhlWebhookLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'webhook_type' => $type,
                'status' => 'failed',
                'payload_sent' => $payload,
                'error_message' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
