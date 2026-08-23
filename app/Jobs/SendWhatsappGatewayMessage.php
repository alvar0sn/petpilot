<?php

namespace App\Jobs;

use App\Models\WhatsappGatewayLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SendWhatsappGatewayMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(private readonly int $logId)
    {
        $this->onQueue('high');
    }

    public function backoff(): array
    {
        return [60, 300, 900]; // 1 min, 5 min, 15 min
    }

    public function handle(): void
    {
        $log = WhatsappGatewayLog::withoutGlobalScopes()->find($this->logId);

        if (!$log || $log->isSuccess()) {
            return;
        }

        $log->increment('attempts');
        $log->update(['last_attempt_at' => now()]);

        try {
            $response = Http::withToken(config('services.whatsapp_gateway.token'))
                ->timeout(10)
                ->post($log->url, $log->payload);

            if ($response->successful()) {
                $log->update([
                    'status'        => 'success',
                    'response_code' => $response->status(),
                    'response_body' => substr($response->body(), 0, 2000),
                    'error_message' => null,
                ]);
                return;
            }

            $log->update([
                'response_code' => $response->status(),
                'response_body' => substr($response->body(), 0, 2000),
                'error_message' => "HTTP {$response->status()}",
            ]);

            throw new \RuntimeException("WhatsApp gateway returned HTTP {$response->status()}");

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            $log->update(['error_message' => 'Connection error: ' . $e->getMessage()]);
            throw $e;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $log->update(['error_message' => $e->getMessage()]);
            throw $e;
        }
    }

    public function failed(\Throwable $e): void
    {
        WhatsappGatewayLog::withoutGlobalScopes()
            ->where('id', $this->logId)
            ->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
    }
}
