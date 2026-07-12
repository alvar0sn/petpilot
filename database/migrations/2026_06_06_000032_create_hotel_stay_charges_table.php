<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_stay_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('stay_id')->constrained('hotel_stays')->cascadeOnDelete();
            $table->foreignId('pos_item_id')->nullable()->constrained('pos_catalog_items')->nullOnDelete();
            $table->string('concepto');
            $table->decimal('precio_unitario', 10, 2);
            $table->decimal('cantidad', 8, 2)->default(1);
            $table->decimal('subtotal', 10, 2);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'stay_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_stay_charges');
    }
};
