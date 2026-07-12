<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignId('catalog_item_id')->nullable()->constrained('pos_catalog_items')->nullOnDelete();
            $table->string('nombre');
            $table->decimal('precio', 10, 2);
            $table->decimal('cantidad', 8, 2)->default(1);
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'appointment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_items');
    }
};
