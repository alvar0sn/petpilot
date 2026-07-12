<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE membership_credit_movements DROP CONSTRAINT IF EXISTS membership_credit_movements_referencia_tipo_check");
        DB::statement("ALTER TABLE membership_credit_movements ADD CONSTRAINT membership_credit_movements_referencia_tipo_check CHECK (referencia_tipo IN ('estancia', 'appointment', 'manual', 'walk'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE membership_credit_movements DROP CONSTRAINT IF EXISTS membership_credit_movements_referencia_tipo_check");
        DB::statement("ALTER TABLE membership_credit_movements ADD CONSTRAINT membership_credit_movements_referencia_tipo_check CHECK (referencia_tipo IN ('estancia', 'appointment', 'manual'))");
    }
};
