<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotel_stays', function (Blueprint $table) {
            $table->foreignId('package_credit_id')->nullable()->after('membership_id')->constrained('package_credits')->nullOnDelete();
            $table->unsignedInteger('creditos_paquete_consumidos')->default(0)->after('creditos_consumidos');
        });
    }

    public function down(): void
    {
        Schema::table('hotel_stays', function (Blueprint $table) {
            $table->dropConstrainedForeignId('package_credit_id');
            $table->dropColumn('creditos_paquete_consumidos');
        });
    }
};
