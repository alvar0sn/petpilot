<?php

namespace Database\Seeders;

use App\Models\ChecklistItem;
use App\Models\EventType;
use App\Models\GroomingStation;
use App\Models\PosCategory;
use App\Models\PosConfig;
use App\Models\PosPaymentMethod;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    public static function run(int $tenantId): void
    {
        self::seedEventTypes($tenantId);
        self::seedPosCategories($tenantId);
        self::seedPosPaymentMethods($tenantId);
        self::seedPosConfig($tenantId);
        self::seedChecklistItems($tenantId);
        self::seedGroomingStations($tenantId);
    }

    private static function seedEventTypes(int $tenantId): void
    {
        $types = [
            ['nombre' => 'Estética', 'intervalo_dias' => 30, 'es_configurable' => true, 'activo' => true],
            ['nombre' => 'Vacuna', 'intervalo_dias' => 365, 'es_configurable' => false, 'activo' => true],
            ['nombre' => 'Desparasitación', 'intervalo_dias' => 90, 'es_configurable' => false, 'activo' => true],
            ['nombre' => 'Consulta', 'intervalo_dias' => null, 'es_configurable' => false, 'activo' => true],
        ];

        foreach ($types as $type) {
            EventType::withoutTenantScope()->firstOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $type['nombre']],
                $type + ['tenant_id' => $tenantId]
            );
        }
    }

    private static function seedPosCategories(int $tenantId): void
    {
        $categories = [
            ['nombre' => 'General', 'orden' => 1, 'es_grooming' => false],
            ['nombre' => 'Grooming', 'orden' => 2, 'es_grooming' => true],
        ];

        foreach ($categories as $i => $cat) {
            PosCategory::withoutTenantScope()->firstOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $cat['nombre']],
                $cat + ['tenant_id' => $tenantId, 'activo' => true]
            );
        }
    }

    private static function seedPosPaymentMethods(int $tenantId): void
    {
        $methods = ['Efectivo', 'Tarjeta', 'Transferencia'];

        foreach ($methods as $i => $nombre) {
            PosPaymentMethod::withoutTenantScope()->firstOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $nombre],
                ['tenant_id' => $tenantId, 'nombre' => $nombre, 'activo' => true, 'orden' => $i + 1]
            );
        }
    }

    private static function seedPosConfig(int $tenantId): void
    {
        $configs = [
            'nombre_negocio' => '',
            'direccion' => '',
            'telefono' => '',
            'folio_siguiente' => '1',
            'ticket_promedio_mxn' => '400',
            'mensaje_pie' => '¡Gracias por tu preferencia!',
            'color_principal' => '#6366F1',
            'logo_url' => '',
            'dias_aviso_membresia' => '7',
        ];

        foreach ($configs as $clave => $valor) {
            PosConfig::withoutTenantScope()->firstOrCreate(
                ['tenant_id' => $tenantId, 'clave' => $clave],
                ['tenant_id' => $tenantId, 'clave' => $clave, 'valor' => $valor]
            );
        }
    }

    private static function seedChecklistItems(int $tenantId): void
    {
        $items = [
            'Baño',
            'Secado',
            'Cepillado',
            'Corte de pelo',
            'Corte de uñas',
            'Limado de uñas',
            'Corte de patas',
            'Limpieza de orejas',
            'Limpieza de glándulas',
            'Corte de pelo en orejas',
            'Bow/moño',
            'Perfume',
        ];

        foreach ($items as $i => $nombre) {
            ChecklistItem::withoutTenantScope()->firstOrCreate(
                ['tenant_id' => $tenantId, 'nombre' => $nombre],
                ['tenant_id' => $tenantId, 'nombre' => $nombre, 'orden' => $i + 1, 'activo' => true]
            );
        }
    }

    private static function seedGroomingStations(int $tenantId): void
    {
        GroomingStation::withoutTenantScope()->firstOrCreate(
            ['tenant_id' => $tenantId, 'nombre' => 'Estación 1'],
            ['tenant_id' => $tenantId, 'nombre' => 'Estación 1', 'activo' => true, 'orden' => 1]
        );
        GroomingStation::withoutTenantScope()->firstOrCreate(
            ['tenant_id' => $tenantId, 'nombre' => 'Estación 2'],
            ['tenant_id' => $tenantId, 'nombre' => 'Estación 2', 'activo' => true, 'orden' => 2]
        );
    }
}
