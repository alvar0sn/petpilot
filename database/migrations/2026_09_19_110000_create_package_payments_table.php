<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
            $table->foreignId('pos_ticket_id')->nullable()->constrained('pos_tickets')->nullOnDelete();
            $table->decimal('monto', 10, 2);
            $table->enum('tipo', ['inicial', 'abono']);
            $table->string('notas')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'package_id']);
        });

        // Los paquetes ya vendidos con su ticket pagado quedan tal cual estaban
        // (siguen dando acceso a sus créditos) — el gate anterior exigía ticket
        // pagado al 100%, así que aquí basta con registrar ese pago tal cual
        // para que el nuevo cálculo por abonos siga dando el mismo resultado.
        // Los paquetes con ticket sin pagar NO se respaldan aquí a propósito:
        // ya estaban bloqueados antes y el nuevo umbral (>0 pagado) los deja igual.
        $packages = DB::table('packages')
            ->join('pos_tickets', 'pos_tickets.id', '=', 'packages.pos_ticket_id')
            ->where('pos_tickets.estado', 'pagado')
            ->select('packages.id', 'packages.tenant_id', 'packages.pos_ticket_id', 'packages.total')
            ->get();

        foreach ($packages as $package) {
            DB::table('package_payments')->insert([
                'tenant_id' => $package->tenant_id,
                'package_id' => $package->id,
                'pos_ticket_id' => $package->pos_ticket_id,
                'monto' => $package->total,
                'tipo' => 'inicial',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('package_payments');
    }
};
