<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_stay_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('stay_id')->constrained('hotel_stays')->cascadeOnDelete();
            $table->enum('tipo', ['cara', 'cuerpo']);
            $table->string('url');
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'stay_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_stay_photos');
    }
};
