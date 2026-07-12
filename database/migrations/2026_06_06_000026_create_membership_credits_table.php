<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo']);
            $table->unsignedInteger('saldo_inicial');
            $table->unsignedInteger('saldo_actual');

            $table->unique(['tenant_id', 'membership_id', 'servicio_tipo']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_credits');
    }
};
