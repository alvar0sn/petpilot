<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_tickets', function (Blueprint $table) {
            $table->boolean('servicio_domicilio')->default(false)->after('comentario_cancelacion');
            $table->text('direccion_entrega')->nullable()->after('servicio_domicilio');
        });
    }

    public function down(): void
    {
        Schema::table('pos_tickets', function (Blueprint $table) {
            $table->dropColumn(['servicio_domicilio', 'direccion_entrega']);
        });
    }
};
