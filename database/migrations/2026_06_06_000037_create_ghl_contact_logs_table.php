<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ghl_contact_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->enum('action', ['create', 'update', 'sync']);
            $table->enum('status', ['success', 'failed', 'skipped']);
            $table->string('ghl_contact_id')->nullable();
            $table->unsignedSmallInteger('http_code')->nullable();
            $table->text('error_message')->nullable();
            $table->json('payload_sent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ghl_contact_logs');
    }
};
