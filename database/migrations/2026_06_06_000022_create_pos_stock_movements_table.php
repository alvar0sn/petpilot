<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('pos_catalog_items')->cascadeOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->enum('tipo', ['venta', 'cancelacion', 'ajuste', 'import']);
            $table->integer('cantidad');
            $table->integer('stock_anterior');
            $table->integer('stock_nuevo');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_stock_movements');
    }
};
