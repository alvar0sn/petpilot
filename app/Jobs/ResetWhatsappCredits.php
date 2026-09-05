<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\WhatsappCreditService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ResetWhatsappCredits implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $tenants = Tenant::whereNotNull('whatsapp_credits_reset_at')
            ->where('whatsapp_credits_reset_at', '<=', today())
            ->get();

        foreach ($tenants as $tenant) {
            WhatsappCreditService::resetFree($tenant);
        }
    }
}
