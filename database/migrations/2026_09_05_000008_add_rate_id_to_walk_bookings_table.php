<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('walk_bookings', function (Blueprint $table) {
            $table->foreignId('rate_id')->nullable()->after('pet_id')->constrained('walk_rates')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('walk_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rate_id');
        });
    }
};
