<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminder_sends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->string('tipo');
            $table->date('fecha');
            $table->enum('origen', ['auto', 'manual'])->default('auto');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['tenant_id', 'pet_id', 'tipo', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_sends');
    }
};
