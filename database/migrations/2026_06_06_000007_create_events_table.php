<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('event_type_id')->constrained('event_types');
            $table->date('fecha');
            $table->text('notas')->nullable();
            $table->string('foto_url')->nullable();
            $table->decimal('peso', 6, 2)->nullable();
            $table->date('proximo_recordatorio')->nullable();
            $table->boolean('recordatorio_enviado')->default(false);

            // Campos de vacuna
            $table->string('vacuna_nombre')->nullable();
            $table->string('vacuna_lote')->nullable();
            $table->string('vacuna_laboratorio')->nullable();

            // Campos de desparasitación
            $table->string('despa_producto')->nullable();
            $table->string('despa_via')->nullable();

            // Campos de consulta
            $table->decimal('consulta_peso', 6, 2)->nullable();
            $table->decimal('consulta_temperatura', 5, 2)->nullable();
            $table->text('consulta_motivo')->nullable();
            $table->text('consulta_diagnostico')->nullable();
            $table->text('consulta_medicamentos')->nullable();
            $table->date('consulta_proxima_cita')->nullable();

            // Campos de estética visual
            $table->boolean('est_verrugas')->default(false);
            $table->boolean('est_pulgas')->default(false);
            $table->boolean('est_secreciones')->default(false);
            $table->boolean('est_lesiones')->default(false);
            $table->boolean('est_alergias')->default(false);
            $table->string('est_manto')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'pet_id']);
            $table->index(['tenant_id', 'proximo_recordatorio', 'recordatorio_enviado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
