<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Move walk config from pos_config to tenants.settings
        $rows = DB::table('pos_config')
            ->whereIn('clave', ['paseos_horas_anticipacion', 'paseos_dias_adelante'])
            ->get();

        // Group by tenant_id
        $byTenant = [];
        foreach ($rows as $row) {
            $byTenant[$row->tenant_id][$row->clave] = $row->valor;
        }

        foreach ($byTenant as $tenantId => $values) {
            $tenant = DB::table('tenants')->where('id', $tenantId)->first();
            if (! $tenant) continue;

            $settings = json_decode($tenant->settings ?? '{}', true) ?? [];
            if (isset($values['paseos_horas_anticipacion'])) {
                data_set($settings, 'paseos.horas_anticipacion', (int) $values['paseos_horas_anticipacion']);
            }
            if (isset($values['paseos_dias_adelante'])) {
                data_set($settings, 'paseos.dias_adelante', (int) $values['paseos_dias_adelante']);
            }

            DB::table('tenants')->where('id', $tenantId)->update([
                'settings' => json_encode($settings),
            ]);
        }

        // Remove the keys from pos_config
        DB::table('pos_config')
            ->whereIn('clave', ['paseos_horas_anticipacion', 'paseos_dias_adelante'])
            ->delete();
    }

    public function down(): void
    {
        // Move walk config back to pos_config from tenants.settings
        $tenants = DB::table('tenants')->whereNotNull('settings')->get();

        foreach ($tenants as $tenant) {
            $settings = json_decode($tenant->settings, true) ?? [];
            $horasAnticipacion = data_get($settings, 'paseos.horas_anticipacion');
            $diasAdelante      = data_get($settings, 'paseos.dias_adelante');

            if ($horasAnticipacion !== null) {
                DB::table('pos_config')->updateOrInsert(
                    ['tenant_id' => $tenant->id, 'clave' => 'paseos_horas_anticipacion'],
                    ['valor' => (string) $horasAnticipacion]
                );
            }
            if ($diasAdelante !== null) {
                DB::table('pos_config')->updateOrInsert(
                    ['tenant_id' => $tenant->id, 'clave' => 'paseos_dias_adelante'],
                    ['valor' => (string) $diasAdelante]
                );
            }
        }
    }
};
