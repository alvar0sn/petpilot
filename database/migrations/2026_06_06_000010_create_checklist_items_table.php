<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre');
            $table->unsignedSmallInteger('orden')->default(0);
            $table->boolean('activo')->default(true);

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_items');
    }
};
