<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotel_stays', function (Blueprint $table) {
            $table->boolean('usar_paquete')->default(true)->after('package_credit_id');
        });
    }

    public function down(): void
    {
        Schema::table('hotel_stays', function (Blueprint $table) {
            $table->dropColumn('usar_paquete');
        });
    }
};
