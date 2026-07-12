<?php

namespace App\Jobs;

use App\Models\MembershipCredit;
use App\Models\MembershipCreditMovement;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ResetMembershipCredits implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $today = today();

        $tenants = Tenant::where('estado', 'activo')->get();

        foreach ($tenants as $tenant) {
            $credits = MembershipCredit::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->whereNotNull('proximo_reinicio')
                ->where('proximo_reinicio', '<=', $today)
                ->whereHas('membership', fn($q) => $q->where('activa', true))
                ->with('membership.plan:id,reinicio_creditos')
                ->get();

            foreach ($credits as $credit) {
                $periodo = $credit->membership?->plan?->reinicio_creditos;

                if (! in_array($periodo, ['semanal', 'mensual'])) {
                    continue;
                }

                $saldoAntes = $credit->saldo_actual;
                $saldoNuevo = $credit->saldo_inicial;
                $proximoReinicio = $periodo === 'semanal'
                    ? $credit->proximo_reinicio->clone()->addWeek()
                    : $credit->proximo_reinicio->clone()->addMonth();

                DB::transaction(function () use ($credit, $tenant, $saldoAntes, $saldoNuevo, $proximoReinicio) {
                    $credit->withoutGlobalScopes()->where('id', $credit->id)->update([
                        'saldo_actual' => $saldoNuevo,
                        'proximo_reinicio' => $proximoReinicio,
                    ]);

                    MembershipCreditMovement::withoutGlobalScopes()->create([
                        'tenant_id' => $tenant->id,
                        'membership_id' => $credit->membership_id,
                        'credit_id' => $credit->id,
                        'servicio_tipo' => $credit->servicio_tipo,
                        'tipo' => 'recarga',
                        'cantidad' => $saldoNuevo - $saldoAntes,
                        'saldo_antes' => $saldoAntes,
                        'saldo_despues' => $saldoNuevo,
                        'referencia_tipo' => 'manual',
                        'notas' => 'Reinicio automático de créditos',
                    ]);
                });
            }
        }
    }
}
