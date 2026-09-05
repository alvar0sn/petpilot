<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('walk_bookings', function (Blueprint $table) {
            $table->foreignId('package_credit_id')->nullable()->after('rate_id')->constrained('package_credits')->nullOnDelete();
        });

        Schema::table('collection_bookings', function (Blueprint $table) {
            $table->foreignId('package_credit_id')->nullable()->after('rate_id')->constrained('package_credits')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('walk_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('package_credit_id');
        });

        Schema::table('collection_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('package_credit_id');
        });
    }
};
