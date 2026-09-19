<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained('memberships')->cascadeOnDelete();
            $table->foreignId('renewal_id')->constrained('membership_renewals')->cascadeOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->decimal('monto', 10, 2);
            $table->enum('tipo', ['inicial', 'abono']);
            $table->string('notas')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'membership_id']);
            $table->index('renewal_id');
        });

        // Antes de esta migración las membresías nunca exigieron pago para dar
        // créditos (a diferencia de paquetes). Para no bloquear de golpe a
        // clientes ya activos, se respalda cada renovación existente como
        // "pagada" tal cual (aunque su ticket siga abierto) — el nuevo gate de
        // "al menos un abono" solo aplica hacia adelante, a renovaciones nuevas.
        $renewals = DB::table('membership_renewals')
            ->select('id', 'tenant_id', 'membership_id', 'pos_ticket_id', 'monto')
            ->get();

        foreach ($renewals as $renewal) {
            DB::table('membership_payments')->insert([
                'tenant_id' => $renewal->tenant_id,
                'membership_id' => $renewal->membership_id,
                'renewal_id' => $renewal->id,
                'pos_ticket_id' => $renewal->pos_ticket_id,
                'monto' => $renewal->monto,
                'tipo' => 'inicial',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_payments');
    }
};
