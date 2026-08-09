<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('responsiva_token', 20)->nullable()->unique()->after('franja');
            $table->text('responsiva_texto')->nullable();
            $table->timestamp('responsiva_enviado_at')->nullable();
            $table->string('responsiva_firma_path')->nullable();
            $table->string('responsiva_firmante_nombre')->nullable();
            $table->timestamp('responsiva_firmado_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'responsiva_token',
                'responsiva_texto',
                'responsiva_enviado_at',
                'responsiva_firma_path',
                'responsiva_firmante_nombre',
                'responsiva_firmado_at',
            ]);
        });
    }
};
