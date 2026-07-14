<?php

namespace App\Providers;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        $this->applySystemSettings();
    }

    private function applySystemSettings(): void
    {
        try {
            $s = SystemSetting::many([
                'r2_key', 'r2_secret', 'r2_bucket', 'r2_account_id', 'r2_public_url',
                'resend_api_key', 'resend_from_address', 'resend_from_name',
            ]);

            if (! empty($s['r2_key'])) {
                config(['filesystems.disks.r2' => [
                    'driver'                  => 's3',
                    'key'                     => $s['r2_key'],
                    'secret'                  => $s['r2_secret'],
                    'region'                  => 'auto',
                    'bucket'                  => $s['r2_bucket'],
                    'url'                     => $s['r2_public_url'],
                    'endpoint'                => 'https://' . $s['r2_account_id'] . '.r2.cloudflarestorage.com',
                    'use_path_style_endpoint' => false,
                    'visibility'              => 'public',
                    'throw'                   => false,
                ]]);
                app()->instance('media_disk', 'r2');
            }

            if (! empty($s['resend_api_key'])) {
                config(['resend.api_key'    => $s['resend_api_key']]);
                config(['mail.default'      => 'resend']);
                config(['mail.from.address' => $s['resend_from_address'] ?? config('mail.from.address')]);
                config(['mail.from.name'    => $s['resend_from_name']    ?? config('mail.from.name')]);
            }
        } catch (\Throwable) {
            // DB may not exist yet (migrations, fresh install)
        }
    }
}
