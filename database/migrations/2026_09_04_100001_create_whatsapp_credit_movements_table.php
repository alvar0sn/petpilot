<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_credit_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['free_grant', 'consumption', 'purchase', 'manual_adjustment']);
            $table->integer('credits');
            $table->enum('source', ['free', 'purchased'])->nullable();
            $table->string('external_reference')->nullable();
            $table->string('mp_payment_id')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'external_reference']);
            $table->unique('mp_payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_credit_movements');
    }
};
