<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre');
            $table->unsignedInteger('intervalo_dias')->nullable();
            $table->boolean('es_configurable')->default(false);
            $table->boolean('activo')->default(true);

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_types');
    }
};
