<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('membership_credit_movements', function (Blueprint $table) {
            $table->string('referencia_tipo', 30)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('membership_credit_movements', function (Blueprint $table) {
            $table->enum('referencia_tipo', ['estancia', 'appointment', 'manual'])->nullable()->change();
        });
    }
};
