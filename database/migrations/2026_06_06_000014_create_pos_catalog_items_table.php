<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_catalog_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('categoria_id')->constrained('pos_categories')->restrictOnDelete();
            $table->string('sku')->nullable();
            $table->string('nombre');
            $table->enum('tipo', ['producto', 'servicio'])->default('servicio');
            $table->decimal('precio', 10, 2)->default(0);
            $table->decimal('costo', 10, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->boolean('activo')->default(true);
            $table->enum('comision_tipo', ['porcentaje', 'fijo'])->nullable();
            $table->decimal('comision_valor', 10, 2)->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_catalog_items');
    }
};
