<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantGhlConfig;
use App\Models\User;
use Database\Seeders\TenantSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TenantService
{
    public function create(array $data): Tenant
    {
        // Core records in transaction
        $tenant = DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'nombre' => $data['nombre'],
                'slug' => $data['slug'],
                'estado' => $data['estado'] ?? 'trial',
                'plan_precio' => $data['plan_precio'] ?? null,
                'notas_internas' => $data['notas_internas'] ?? null,
            ]);

            User::create([
                'tenant_id' => $tenant->id,
                'nombre' => $data['admin_nombre'],
                'apellido' => $data['admin_apellido'] ?? null,
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'role' => 'tenant_admin',
                'activo' => true,
            ]);

            TenantGhlConfig::create([
                'tenant_id' => $tenant->id,
                'api_key' => $data['ghl_api_key'] ?? null,
                'location_id' => $data['ghl_location_id'] ?? null,
                'activo' => false,
            ]);

            return $tenant;
        });

        // Seed default data outside transaction (avoids SQLite lock contention)
        TenantSeeder::run($tenant->id);

        return $tenant;
    }

    public function updateGhl(Tenant $tenant, array $data): void
    {
        $config = $tenant->ghlConfig ?? new TenantGhlConfig(['tenant_id' => $tenant->id]);

        $config->fill([
            'location_id' => $data['location_id'] ?? $config->location_id,
            'webhook_recordatorios' => $data['webhook_recordatorios'] ?? null,
            'webhook_cumpleanos' => $data['webhook_cumpleanos'] ?? null,
            'webhook_reviews' => $data['webhook_reviews'] ?? null,
            'webhook_membresia_vencimiento' => $data['webhook_membresia_vencimiento'] ?? null,
            'webhook_checkin_hotel' => $data['webhook_checkin_hotel'] ?? null,
            'webhook_checkout_hotel' => $data['webhook_checkout_hotel'] ?? null,
            'webhook_whatsapp_pos' => $data['webhook_whatsapp_pos'] ?? null,
            'activo' => $data['activo'] ?? false,
        ]);

        if (! empty($data['api_key'])) {
            $config->api_key = $data['api_key'];
        }

        $config->save();
    }
}
