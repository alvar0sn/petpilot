<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_ghl_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->text('api_key')->nullable();
            $table->string('location_id')->nullable();
            $table->string('webhook_recordatorios')->nullable();
            $table->string('webhook_cumpleanos')->nullable();
            $table->string('webhook_reviews')->nullable();
            $table->string('webhook_membresia_vencimiento')->nullable();
            $table->string('webhook_checkin_hotel')->nullable();
            $table->string('webhook_checkout_hotel')->nullable();
            $table->boolean('activo')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_ghl_configs');
    }
};
