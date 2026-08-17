<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mp_webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('payment_request_id')->nullable()->constrained('payment_requests')->nullOnDelete();
            $table->string('mp_payment_id')->nullable();
            $table->string('topic')->nullable();
            $table->json('raw_payload')->nullable();
            $table->boolean('signature_valid')->nullable();
            $table->enum('status', ['procesado', 'ignorado', 'error'])->default('procesado');
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('payment_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mp_webhook_logs');
    }
};
