<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pos_ticket_id')->constrained('pos_tickets')->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('external_reference')->unique();
            $table->decimal('monto', 10, 2);
            $table->enum('estado', ['pendiente', 'aprobado', 'rechazado', 'cancelado', 'expirado'])->default('pendiente');
            $table->string('mp_preference_id')->nullable();
            $table->text('mp_init_point')->nullable();
            $table->string('mp_payment_id')->nullable();
            $table->foreignId('pos_payment_id')->nullable()->constrained('pos_payments')->nullOnDelete();
            $table->string('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->json('raw_last_status')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'pos_ticket_id']);
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_requests');
    }
};
