<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->foreignId('walker_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notas')->nullable();
            $table->enum('estado', ['pendiente', 'completado', 'cancelado'])->default('pendiente');
            $table->boolean('cobro_membresia')->default(false);
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'pet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walks');
    }
};
