<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_spaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre');
            $table->boolean('activo')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_spaces');
    }
};
