<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collection_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre');
            $table->enum('unidad', ['km']);
            $table->decimal('cantidad', 8, 2);
            $table->decimal('precio', 10, 2);
            $table->foreignId('pos_item_id')->nullable()->constrained('pos_catalog_items')->nullOnDelete();
            $table->boolean('activa')->default(true);

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_rates');
    }
};
