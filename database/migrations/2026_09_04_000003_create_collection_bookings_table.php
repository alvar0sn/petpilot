<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collection_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('slot_id')->constrained('collection_slots')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->text('direccion')->nullable();
            $table->string('ubicacion_url', 2048)->nullable();
            $table->foreignId('rate_id')->nullable()->constrained('collection_rates')->nullOnDelete();
            $table->enum('tipo_viaje', ['recoleccion', 'entrega', 'ida_y_vuelta'])->default('recoleccion');
            $table->enum('estado', ['programado', 'en_ruta', 'completado', 'cancelado'])->default('programado');
            $table->boolean('cobro_membresia')->default(false);
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->string('origen_tipo', 30)->nullable();
            $table->unsignedBigInteger('origen_id')->nullable();
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'slot_id']);
            $table->index(['tenant_id', 'owner_id']);
            $table->index(['tenant_id', 'pet_id']);
            $table->index(['origen_tipo', 'origen_id']);
            $table->unique(['slot_id', 'pet_id', 'tipo_viaje']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_bookings');
    }
};
