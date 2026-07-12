<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('ghl_contact_id')->nullable();
            $table->enum('ghl_sync_status', ['synced', 'pending', 'failed'])->default('pending');
            $table->string('nombre');
            $table->string('telefono');
            $table->string('email')->nullable();
            $table->string('direccion')->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'telefono']);
            $table->unique(['tenant_id', 'telefono']);
            $table->index(['tenant_id', 'ghl_contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owners');
    }
};
