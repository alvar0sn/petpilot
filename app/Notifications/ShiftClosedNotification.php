<?php

namespace App\Notifications;

use App\Models\PosTicketConfig;
use App\Models\Tenant;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ShiftClosedNotification extends Notification
{
    public function __construct(
        public Tenant $tenant,
        public array $summary,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $config = PosTicketConfig::first();

        return (new MailMessage)
            ->subject("Turno cerrado — {$this->tenant->nombre}")
            ->view('emails.shift-closed', [
                'tenant' => $this->tenant,
                'logoUrl' => media_url($config?->logo_path),
                ...$this->summary,
            ]);
    }
}
