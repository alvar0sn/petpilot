<?php

namespace App\Jobs;

use App\Models\Pet;
use App\Models\Tenant;
use App\Services\GhlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessBirthdays implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(GhlService $ghl): void
    {
        $today = today();

        $tenants = Tenant::where('estado', 'activo')->get();

        foreach ($tenants as $tenant) {
            $pets = Pet::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('estado', 'activo')
                ->whereNotNull('fecha_nacimiento')
                ->whereRaw('MONTH(fecha_nacimiento) = ?', [$today->month])
                ->whereRaw('DAY(fecha_nacimiento) = ?', [$today->day])
                ->with(['owner:id,nombre,telefono,ghl_contact_id'])
                ->get();

            foreach ($pets as $pet) {
                $owner = $pet->owner;
                if (! $owner?->ghl_contact_id) {
                    continue;
                }

                $edad = $today->year - \Carbon\Carbon::parse($pet->fecha_nacimiento)->year;

                $ghl->sendWebhook($tenant->id, 'cumpleanos', [
                    'tipo' => 'cumpleanos',
                    'ghl_contact_id' => $owner->ghl_contact_id,
                    'owner_nombre' => $owner->nombre,
                    'owner_telefono' => $owner->telefono,
                    'pet_nombre' => $pet->nombre,
                    'edad_anos' => $edad,
                ]);
            }
        }
    }
}
