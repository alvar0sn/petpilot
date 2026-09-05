<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_items', function (Blueprint $table) {
            $table->foreignId('package_credit_id')->nullable()->after('catalog_item_id')->constrained('package_credits')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointment_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('package_credit_id');
        });
    }
};
