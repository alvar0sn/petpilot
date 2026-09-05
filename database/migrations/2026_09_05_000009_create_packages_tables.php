<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->decimal('subtotal', 10, 2);
            $table->enum('descuento_tipo', ['monto', 'porcentaje'])->nullable();
            $table->decimal('descuento_valor', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->date('fecha_vencimiento');
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'pet_id']);
        });

        Schema::create('package_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
            $table->foreignId('pos_catalog_item_id')->nullable()->constrained('pos_catalog_items')->nullOnDelete();
            $table->string('nombre_snapshot');
            $table->decimal('precio_snapshot', 10, 2);
            $table->decimal('cantidad', 8, 2);
            $table->decimal('subtotal', 10, 2);
        });

        Schema::create('package_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
            $table->foreignId('pet_id')->constrained('pets')->cascadeOnDelete();
            $table->foreignId('pos_catalog_item_id')->constrained('pos_catalog_items')->cascadeOnDelete();
            $table->string('nombre_snapshot');
            $table->decimal('saldo_inicial', 8, 2);
            $table->decimal('saldo_actual', 8, 2);
            $table->date('fecha_vencimiento');

            $table->index(['tenant_id', 'pet_id', 'pos_catalog_item_id']);
        });

        Schema::create('package_credit_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('credit_id')->constrained('package_credits')->cascadeOnDelete();
            $table->enum('tipo', ['consumo', 'ajuste', 'vencimiento']);
            $table->decimal('cantidad', 8, 2);
            $table->decimal('saldo_antes', 8, 2);
            $table->decimal('saldo_despues', 8, 2);
            $table->string('referencia_tipo', 30)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notas')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'credit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_credit_movements');
        Schema::dropIfExists('package_credits');
        Schema::dropIfExists('package_items');
        Schema::dropIfExists('packages');
    }
};
