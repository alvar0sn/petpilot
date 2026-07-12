<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        // Handle both clean state and post-failure state (table already renamed)
        if (Schema::hasTable('membership_credit_movements') && !Schema::hasTable('membership_credit_movements_old')) {
            DB::statement('ALTER TABLE membership_credit_movements RENAME TO membership_credit_movements_old');
        }

        // Indexes retain original names after SQLite table rename — drop them
        DB::statement('DROP INDEX IF EXISTS "membership_credit_movements_tenant_id_index"');
        DB::statement('DROP INDEX IF EXISTS "membership_credit_movements_tenant_id_membership_id_index"');

        Schema::dropIfExists('membership_credit_movements');

        Schema::create('membership_credit_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->foreignId('credit_id')->constrained('membership_credits')->cascadeOnDelete();
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo']);
            $table->enum('tipo', ['consumo', 'recarga', 'ajuste', 'vencimiento']);
            $table->integer('cantidad');
            $table->unsignedInteger('saldo_antes');
            $table->unsignedInteger('saldo_despues');
            $table->enum('referencia_tipo', ['estancia', 'appointment', 'manual', 'walk'])->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notas')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'membership_id']);
        });

        if (Schema::hasTable('membership_credit_movements_old')) {
            DB::statement('INSERT INTO membership_credit_movements SELECT * FROM membership_credit_movements_old');
            DB::statement('DROP TABLE membership_credit_movements_old');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        if (Schema::hasTable('membership_credit_movements') && !Schema::hasTable('membership_credit_movements_old')) {
            DB::statement('ALTER TABLE membership_credit_movements RENAME TO membership_credit_movements_old');
        }

        DB::statement('DROP INDEX IF EXISTS "membership_credit_movements_tenant_id_index"');
        DB::statement('DROP INDEX IF EXISTS "membership_credit_movements_tenant_id_membership_id_index"');

        Schema::dropIfExists('membership_credit_movements');

        Schema::create('membership_credit_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->foreignId('credit_id')->constrained('membership_credits')->cascadeOnDelete();
            $table->enum('servicio_tipo', ['guarderia', 'hotel', 'estetica', 'paseo']);
            $table->enum('tipo', ['consumo', 'recarga', 'ajuste', 'vencimiento']);
            $table->integer('cantidad');
            $table->unsignedInteger('saldo_antes');
            $table->unsignedInteger('saldo_despues');
            $table->enum('referencia_tipo', ['estancia', 'appointment', 'manual'])->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notas')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'membership_id']);
        });

        if (Schema::hasTable('membership_credit_movements_old')) {
            DB::statement('INSERT INTO membership_credit_movements SELECT * FROM membership_credit_movements_old');
            DB::statement('DROP TABLE membership_credit_movements_old');
        }
    }
};
