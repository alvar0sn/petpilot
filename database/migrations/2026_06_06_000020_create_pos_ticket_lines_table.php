<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_ticket_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ticket_id')->constrained('pos_tickets')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('pos_catalog_items')->nullOnDelete();
            $table->string('nombre_snapshot');
            $table->decimal('precio_snapshot', 10, 2);
            $table->decimal('costo_snapshot', 10, 2)->default(0);
            $table->decimal('cantidad', 10, 3)->default(1);
            $table->decimal('subtotal', 10, 2);

            $table->index('tenant_id');
            $table->index(['tenant_id', 'ticket_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_ticket_lines');
    }
};
