<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained('pos_shifts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->enum('tipo', ['deposito', 'salida']);
            $table->decimal('monto', 10, 2);
            $table->string('comentario')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'shift_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_cash_movements');
    }
};
