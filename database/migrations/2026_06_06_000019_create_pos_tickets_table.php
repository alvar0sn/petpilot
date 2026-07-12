<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('folio');
            $table->string('token')->unique();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->enum('estado', ['abierto', 'pagado', 'cancelado'])->default('abierto');
            $table->foreignId('shift_open_id')->nullable()->constrained('pos_shifts')->nullOnDelete();
            $table->foreignId('shift_close_id')->nullable()->constrained('pos_shifts')->nullOnDelete();
            $table->foreignId('user_open_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('user_close_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('user_last_edit_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('discount_id')->nullable()->constrained('pos_discounts')->nullOnDelete();
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->text('comentario_cancelacion')->nullable();
            $table->timestamp('cobrado_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'folio']);
            $table->index('tenant_id');
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_tickets');
    }
};
