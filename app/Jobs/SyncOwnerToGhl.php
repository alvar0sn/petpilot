<?php

namespace App\Jobs;

use App\Models\Owner;
use App\Services\GhlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncOwnerToGhl implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        private readonly int $tenantId,
        private readonly int $ownerId,
    ) {}

    public function handle(GhlService $ghl): void
    {
        $owner = Owner::withoutGlobalScopes()->find($this->ownerId);

        if (! $owner || $owner->tenant_id !== $this->tenantId) {
            return;
        }

        $ghl->syncContact($this->tenantId, $owner);
    }
}
