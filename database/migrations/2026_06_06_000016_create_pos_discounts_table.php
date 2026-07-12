<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre');
            $table->enum('tipo', ['porcentaje', 'monto', 'cupon'])->default('porcentaje');
            $table->decimal('valor', 10, 2);
            $table->string('codigo')->nullable();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->boolean('enviar_whatsapp')->default(false);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_discounts');
    }
};
