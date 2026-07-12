<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_stay_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('stay_id')->constrained('hotel_stays')->cascadeOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->decimal('monto', 10, 2);
            $table->enum('tipo', ['adelanto', 'abono']);
            $table->string('notas')->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_stay_payments');
    }
};
