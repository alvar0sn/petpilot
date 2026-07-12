<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('membership_plans');
            $table->date('fecha_inicio');
            $table->date('fecha_vencimiento');
            $table->boolean('activa')->default(true);
            $table->boolean('aviso_enviado')->default(false);
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'pet_id', 'activa']);
            $table->index(['tenant_id', 'fecha_vencimiento', 'activa']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memberships');
    }
};
