<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ghl_webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('webhook_type');
            $table->enum('status', ['success', 'failed']);
            $table->unsignedSmallInteger('http_code')->nullable();
            $table->json('payload_sent')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'webhook_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ghl_webhook_logs');
    }
};
