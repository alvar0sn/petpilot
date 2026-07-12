<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->date('recordatorio_vacuna')->nullable()->after('peso');
            $table->date('recordatorio_despa')->nullable()->after('recordatorio_vacuna');
            $table->date('recordatorio_consulta')->nullable()->after('recordatorio_despa');
            $table->date('recordatorio_estetica')->nullable()->after('recordatorio_consulta');
        });
    }

    public function down(): void
    {
        Schema::table('pets', function (Blueprint $table) {
            $table->dropColumn(['recordatorio_vacuna', 'recordatorio_despa', 'recordatorio_consulta', 'recordatorio_estetica']);
        });
    }
};
