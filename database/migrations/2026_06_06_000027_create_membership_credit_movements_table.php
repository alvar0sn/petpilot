<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_credit_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->foreignId('credit_id')->constrained('membership_credits')->cascadeOnDelete();
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo']);
            $table->enum('tipo', ['consumo', 'recarga', 'ajuste', 'vencimiento']);
            $table->integer('cantidad');
            $table->unsignedInteger('saldo_antes');
            $table->unsignedInteger('saldo_despues');
            $table->enum('referencia_tipo', ['estancia', 'appointment', 'manual'])->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notas')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'membership_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_credit_movements');
    }
};
