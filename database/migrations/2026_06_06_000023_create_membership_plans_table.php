<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre');
            $table->decimal('precio', 10, 2);
            $table->unsignedInteger('vigencia_dias');
            $table->foreignId('pos_item_id')->nullable()->constrained('pos_catalog_items')->nullOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_plans');
    }
};
