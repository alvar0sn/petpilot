<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->unsignedInteger('whatsapp_free_credits')->default(1000);
            $table->unsignedInteger('whatsapp_purchased_credits')->default(0);
            $table->unsignedInteger('whatsapp_free_credits_monthly')->nullable();
            $table->date('whatsapp_credits_reset_at')->nullable();
        });

        // El reset es en el aniversario de alta del tenant, no calendario —
        // sembramos la primera fecha a partir de created_at.
        DB::table('tenants')->select('id', 'created_at')->orderBy('id')->each(function ($tenant) {
            DB::table('tenants')->where('id', $tenant->id)->update([
                'whatsapp_credits_reset_at' => Carbon::parse($tenant->created_at)->addMonthNoOverflow(),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'whatsapp_free_credits',
                'whatsapp_purchased_credits',
                'whatsapp_free_credits_monthly',
                'whatsapp_credits_reset_at',
            ]);
        });
    }
};
