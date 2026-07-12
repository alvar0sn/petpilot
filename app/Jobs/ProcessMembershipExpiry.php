<?php

namespace App\Jobs;

use App\Models\Membership;
use App\Models\Tenant;
use App\Services\GhlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessMembershipExpiry implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(GhlService $ghl): void
    {
        $today = today();

        // Desactivar membresías vencidas
        Membership::withoutGlobalScopes()
            ->where('activa', true)
            ->where('fecha_vencimiento', '<', $today)
            ->update(['activa' => false]);

        // Avisos de membresías por vencer
        $tenants = Tenant::where('estado', 'activo')->get();

        foreach ($tenants as $tenant) {
            $diasAviso = 7; // configurable en futuro desde tenant settings

            $memberships = Membership::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('activa', true)
                ->where('aviso_enviado', false)
                ->where('fecha_vencimiento', '<=', $today->clone()->addDays($diasAviso))
                ->with(['pet.owner:id,nombre,telefono,ghl_contact_id', 'plan:id,nombre', 'credits'])
                ->get();

            foreach ($memberships as $membership) {
                $owner = $membership->pet?->owner;
                if (! $owner?->ghl_contact_id) {
                    $membership->update(['aviso_enviado' => true]);
                    continue;
                }

                $saldoPorServicio = $membership->credits->mapWithKeys(fn($c) => [
                    $c->servicio_tipo => $c->saldo_actual,
                ]);

                $ghl->sendWebhook($tenant->id, 'membresia_vencimiento', [
                    'tipo' => 'membresia_vencimiento',
                    'ghl_contact_id' => $owner->ghl_contact_id,
                    'owner_nombre' => $owner->nombre,
                    'owner_telefono' => $owner->telefono,
                    'pet_nombre' => $membership->pet->nombre,
                    'plan_nombre' => $membership->plan?->nombre,
                    'saldo_por_servicio' => $saldoPorServicio,
                    'fecha_vencimiento' => $membership->fecha_vencimiento,
                    'dias_para_vencer' => $today->diffInDays($membership->fecha_vencimiento),
                ]);

                $membership->update(['aviso_enviado' => true]);
            }
        }
    }
}
