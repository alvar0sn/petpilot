<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pet_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->string('nombre');
            $table->string('tipo_mime')->nullable();
            $table->unsignedBigInteger('tamanio_bytes')->nullable();
            $table->string('archivo_url');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'pet_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pet_files');
    }
};
