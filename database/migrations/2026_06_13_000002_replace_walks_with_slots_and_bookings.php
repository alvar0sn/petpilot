<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('walks');

        Schema::create('walk_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->enum('tipo', ['grupal', 'privado']);
            $table->date('fecha');
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->unsignedSmallInteger('cupo_maximo')->nullable();
            $table->foreignId('walker_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('estado', ['abierto', 'en_curso', 'completado', 'cancelado'])->default('abierto');
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'fecha']);
            $table->index(['tenant_id', 'estado']);
        });

        Schema::create('walk_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('slot_id')->constrained('walk_slots')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->enum('estado', ['solicitado', 'aprobado', 'cancelado'])->default('solicitado');
            $table->boolean('cobro_membresia')->default(false);
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->boolean('solicitud_owner')->default(false);
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'slot_id']);
            $table->index(['tenant_id', 'pet_id']);
            $table->unique(['slot_id', 'pet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walk_bookings');
        Schema::dropIfExists('walk_slots');
        Schema::create('walks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }
};
