<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamp('fecha_apertura');
            $table->timestamp('fecha_cierre')->nullable();
            $table->decimal('fondo_inicial', 10, 2)->default(0);
            $table->decimal('efectivo_contado', 10, 2)->nullable();
            $table->enum('estado', ['abierto', 'cerrado'])->default('abierto');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_shifts');
    }
};
