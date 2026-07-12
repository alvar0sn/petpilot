<?php

namespace App\Jobs;

use App\Models\Event;
use App\Models\Tenant;
use App\Services\GhlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(GhlService $ghl): void
    {
        $tenants = Tenant::where('estado', 'activo')->get();

        foreach ($tenants as $tenant) {
            $events = Event::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->whereDate('proximo_recordatorio', today())
                ->where('recordatorio_enviado', false)
                ->with(['pet.owner:id,nombre,telefono,ghl_contact_id', 'eventType:id,nombre'])
                ->get();

            foreach ($events as $event) {
                $owner = $event->pet?->owner;
                if (! $owner?->ghl_contact_id) {
                    continue;
                }

                $ghl->sendWebhook($tenant->id, 'recordatorio', [
                    'tipo' => 'recordatorio',
                    'tipo_servicio' => $event->eventType?->nombre,
                    'ghl_contact_id' => $owner->ghl_contact_id,
                    'owner_nombre' => $owner->nombre,
                    'owner_telefono' => $owner->telefono,
                    'pet_nombre' => $event->pet->nombre,
                    'pet_raza' => $event->pet->raza,
                    'fecha_servicio' => $event->proximo_recordatorio,
                ]);

                $event->update(['recordatorio_enviado' => true]);
            }
        }
    }
}
