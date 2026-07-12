<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->foreignId('tipo_servicio_id')->constrained('event_types');
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin')->nullable();
            $table->enum('estado', ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_show'])->default('pendiente');
            $table->foreignId('groomer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('station_id')->nullable()->constrained('grooming_stations')->nullOnDelete();
            $table->text('notas_internas')->nullable();
            $table->enum('created_via', ['operador', 'formulario_web', 'whatsapp'])->default('operador');
            $table->foreignId('event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->foreignId('stay_id')->nullable()->constrained('hotel_stays')->nullOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->boolean('cobro_membresia')->default(false);
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'pet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
