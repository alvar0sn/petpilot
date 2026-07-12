<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walk_recurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->enum('tipo', ['grupal', 'privado']);
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->unsignedSmallInteger('cupo_maximo')->nullable();
            $table->foreignId('walker_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('recurrence_type', ['daily', 'weekly']);
            $table->json('recurrence_days')->nullable(); // [0..6] 0=Dom, 1=Lun ... for weekly
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('tenant_id');
        });

        Schema::table('walk_slots', function (Blueprint $table) {
            $table->foreignId('recurrence_id')
                ->nullable()
                ->constrained('walk_recurrences')
                ->nullOnDelete()
                ->after('created_by');
        });
    }

    public function down(): void
    {
        Schema::table('walk_slots', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\WalkRecurrence::class);
            $table->dropColumn('recurrence_id');
        });
        Schema::dropIfExists('walk_recurrences');
    }
};
