<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('foto_url')->nullable();
            $table->string('raza')->nullable();
            $table->enum('tipo', ['perro', 'gato', 'roedor', 'reptil', 'otro'])->default('perro');
            $table->enum('tamanio', ['pequeño', 'mediano', 'grande'])->nullable();
            $table->enum('sexo', ['macho', 'hembra'])->nullable();
            $table->boolean('esterilizado')->default(false);
            $table->decimal('peso', 6, 2)->nullable();
            $table->enum('nivel_agresividad', ['tranquilo', 'precaucion', 'agresivo'])->default('tranquilo');
            $table->date('fecha_nacimiento')->nullable();
            $table->text('alergias')->nullable();
            $table->text('padecimientos')->nullable();
            $table->text('obs_comportamiento')->nullable();
            $table->string('num_expediente')->nullable();
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'owner_id']);
            $table->index(['tenant_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};
