<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Mismo problema que 2026_09_05_000005: la migración
 * 2026_08_07_145428_widen_servicio_tipo_columns_to_string amplió estas
 * columnas a string(30) libre, pero en Postgres un ->change() sobre una
 * columna enum() no elimina el CHECK constraint que Laravel generó al
 * crearla — sigue activo con los valores viejos
 * ('guarderia','hotel','estetica','paseo') y bloquea 'recoleccion' y
 * 'entrenamiento'.
 */
return new class extends Migration
{
    private const TABLES = [
        'membership_plan_credits',
        'membership_credits',
        'membership_credit_movements',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$table}_servicio_tipo_check");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_servicio_tipo_check CHECK (servicio_tipo IN ('guarderia', 'hotel', 'estetica', 'paseo'))");
        }
    }
};
