<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pos_ticket_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->unique();
            $table->string('logo_path')->nullable();
            $table->string('color_primario', 20)->default('#4f46e5');
            $table->string('color_texto', 20)->default('#1f2937');
            $table->string('color_fondo', 20)->default('#ffffff');
            $table->text('mensaje_pie')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_ticket_configs');
    }
};
