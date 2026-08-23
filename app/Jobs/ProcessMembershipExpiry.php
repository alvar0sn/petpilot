<?php

namespace App\Jobs;

use App\Models\Membership;
use App\Models\Tenant;
use App\Services\GhlService;
use App\Services\WhatsappGatewayService;
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
            $diasAviso = (int) $tenant->getSetting('whatsapp.triggers.membership_expiring.days_before', 7);

            $memberships = Membership::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('activa', true)
                ->where('aviso_enviado', false)
                ->where('fecha_vencimiento', '<=', $today->clone()->addDays($diasAviso))
                ->with(['pet.owner:id,nombre,apellidos,telefono,email,ghl_contact_id', 'plan:id,nombre', 'credits'])
                ->get();

            foreach ($memberships as $membership) {
                $owner = $membership->pet?->owner;
                $diasParaVencer = $today->diffInDays($membership->fecha_vencimiento);

                if ($owner?->ghl_contact_id) {
                    $saldoPorServicio = $membership->credits->mapWithKeys(fn($c) => [
                        $c->servicio_tipo => $c->saldo_actual,
                    ]);

                    $ghl->sendWebhook($tenant->id, 'membresia_vencimiento', [
                        'tipo' => 'membresia_vencimiento',
                        'ghl_contact_id' => $owner->ghl_contact_id,
                        'owner_nombre' => $owner->nombre,
                        'owner_apellidos' => $owner->apellidos,
                        'owner_telefono' => $owner->telefono,
                        'owner_email' => $owner->email,
                        'negocio' => $tenant->nombre,
                        'pet_nombre' => $membership->pet->nombre,
                        'plan_nombre' => $membership->plan?->nombre,
                        'saldo_por_servicio' => $saldoPorServicio,
                        'fecha_vencimiento' => $membership->fecha_vencimiento,
                        'dias_para_vencer' => $diasParaVencer,
                    ]);
                }

                if ($owner) {
                    WhatsappGatewayService::send($tenant, 'membership_expiring', $owner, [
                        'pet_name' => $membership->pet->nombre,
                        'plan' => $membership->plan?->nombre ?? '',
                        'expires_at' => $membership->fecha_vencimiento->locale('es')->isoFormat('D [de] MMMM YYYY'),
                        'days_before' => (string) $diasParaVencer,
                    ], "membership_expiring:{$membership->id}:{$membership->fecha_vencimiento->toDateString()}");
                }

                $membership->update(['aviso_enviado' => true]);
            }
        }
    }
}
