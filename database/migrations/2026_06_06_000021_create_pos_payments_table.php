<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ticket_id')->constrained('pos_tickets')->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('pos_payment_methods');
            $table->decimal('monto', 10, 2);

            $table->index('tenant_id');
            $table->index(['tenant_id', 'ticket_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_payments');
    }
};
