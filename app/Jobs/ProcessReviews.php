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

class ProcessReviews implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(GhlService $ghl): void
    {
        $yesterday = today()->subDay();
        $tenants = Tenant::where('estado', 'activo')->get();

        foreach ($tenants as $tenant) {
            $events = Event::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->whereDate('fecha', $yesterday)
                ->with(['pet.owner:id,nombre,telefono,ghl_contact_id', 'eventType:id,nombre'])
                ->get();

            $alreadySentOwners = collect();

            foreach ($events as $event) {
                $owner = $event->pet?->owner;
                if (! $owner?->ghl_contact_id || $alreadySentOwners->contains($owner->id)) {
                    continue;
                }

                $ghl->sendWebhook($tenant->id, 'review', [
                    'tipo' => 'review',
                    'ghl_contact_id' => $owner->ghl_contact_id,
                    'owner_nombre' => $owner->nombre,
                    'owner_telefono' => $owner->telefono,
                    'pet_nombre' => $event->pet->nombre,
                    'tipo_servicio' => $event->eventType?->nombre,
                ]);

                $alreadySentOwners->push($owner->id);
            }
        }
    }
}
