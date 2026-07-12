<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotel_stay_photos', function (Blueprint $table) {
            $table->dropColumn('tipo');
            $table->string('etiqueta')->nullable()->after('stay_id');
        });
    }

    public function down(): void
    {
        Schema::table('hotel_stay_photos', function (Blueprint $table) {
            $table->dropColumn('etiqueta');
            $table->enum('tipo', ['cara', 'cuerpo'])->after('stay_id');
        });
    }
};
