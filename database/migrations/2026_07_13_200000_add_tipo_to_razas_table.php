<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('razas', function (Blueprint $table) {
            $table->string('tipo')->default('perro')->after('nombre');
            $table->dropUnique(['tenant_id', 'nombre']);
            $table->unique(['tenant_id', 'tipo', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::table('razas', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'tipo', 'nombre']);
            $table->dropColumn('tipo');
            $table->unique(['tenant_id', 'nombre']);
        });
    }
};
