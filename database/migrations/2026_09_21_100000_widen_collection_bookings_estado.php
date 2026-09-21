<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega el estado 'no_show' a collection_bookings.estado. Mismo problema que
 * 2026_08_07_145428_widen_servicio_tipo_columns_to_string: un ->change() sobre
 * una columna enum() no elimina el CHECK constraint que Laravel generó al
 * crearla en Postgres, así que hay que ensancharla a string y tumbar el
 * constraint viejo aparte.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collection_bookings', function (Blueprint $table) {
            $table->string('estado', 20)->default('programado')->change();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE collection_bookings DROP CONSTRAINT IF EXISTS collection_bookings_estado_check');
        }
    }

    public function down(): void
    {
        Schema::table('collection_bookings', function (Blueprint $table) {
            $table->enum('estado', ['programado', 'en_ruta', 'completado', 'cancelado'])->default('programado')->change();
        });
    }
};
