<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('membership_plan_credits', function (Blueprint $table) {
            $table->string('servicio_tipo', 30)->change();
        });

        Schema::table('membership_credits', function (Blueprint $table) {
            $table->string('servicio_tipo', 30)->change();
        });

        Schema::table('membership_credit_movements', function (Blueprint $table) {
            $table->string('servicio_tipo', 30)->change();
        });
    }

    public function down(): void
    {
        Schema::table('membership_plan_credits', function (Blueprint $table) {
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo'])->change();
        });

        Schema::table('membership_credits', function (Blueprint $table) {
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo'])->change();
        });

        Schema::table('membership_credit_movements', function (Blueprint $table) {
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo'])->change();
        });
    }
};
