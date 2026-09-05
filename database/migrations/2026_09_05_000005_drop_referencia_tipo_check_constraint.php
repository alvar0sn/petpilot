<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * La migración 2026_08_22_000002 amplió referencia_tipo a string(30) libre,
 * pero en Postgres un ->change() sobre una columna enum() no elimina el
 * CHECK constraint que Laravel generó al crearla — sigue activo con los
 * valores viejos ('estancia','appointment','manual','walk') y bloquea
 * cualquier valor nuevo (p.ej. 'collection', 'renovacion').
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE membership_credit_movements DROP CONSTRAINT IF EXISTS membership_credit_movements_referencia_tipo_check');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE membership_credit_movements ADD CONSTRAINT membership_credit_movements_referencia_tipo_check CHECK (referencia_tipo IN ('estancia', 'appointment', 'manual', 'walk'))");
    }
};
