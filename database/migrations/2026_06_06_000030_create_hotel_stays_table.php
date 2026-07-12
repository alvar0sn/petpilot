<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_stays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('space_id')->nullable()->constrained('hotel_spaces')->nullOnDelete();
            $table->enum('tipo', ['guarderia', 'hotel']);
            $table->enum('estado', ['reservado', 'activo', 'completado', 'cancelado', 'no_presento'])->default('reservado');
            $table->timestamp('fecha_entrada');
            $table->timestamp('fecha_salida')->nullable();
            $table->text('alimentacion')->nullable();
            $table->text('medicacion')->nullable();
            $table->text('notas')->nullable();
            $table->enum('estado_fisico', ['ok', 'lesion'])->default('ok');
            $table->text('nota_lesion')->nullable();
            $table->text('objetos_recibidos')->nullable();
            $table->text('motivo_cancelacion')->nullable();
            $table->foreignId('rate_id')->nullable()->constrained('hotel_rates')->nullOnDelete();
            $table->decimal('precio_por_noche', 10, 2)->nullable();
            $table->boolean('cobro_membresia')->default(false);
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'pet_id']);
            $table->index(['tenant_id', 'fecha_entrada', 'fecha_salida']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_stays');
    }
};
