<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('membership_plans', function (Blueprint $table) {
            $table->enum('reinicio_creditos', ['ninguno', 'semanal', 'mensual'])->default('ninguno')->after('vigencia_dias');
        });

        Schema::table('membership_credits', function (Blueprint $table) {
            $table->date('proximo_reinicio')->nullable()->after('saldo_actual');
        });
    }

    public function down(): void
    {
        Schema::table('membership_credits', function (Blueprint $table) {
            $table->dropColumn('proximo_reinicio');
        });

        Schema::table('membership_plans', function (Blueprint $table) {
            $table->dropColumn('reinicio_creditos');
        });
    }
};
