<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserPasswordReset extends Notification
{
    public function __construct(
        private string $token,
        private ?string $tenantNombre = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isActivation = is_null($notifiable->password);

        $url = url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        $message = (new MailMessage)
            ->subject($isActivation
                ? 'Activa tu cuenta — Petpilot'
                : 'Restablece tu contraseña — Petpilot')
            ->greeting("Hola, {$notifiable->nombre}!");

        if ($isActivation) {
            $message
                ->line("Creamos tu cuenta de administrador para **{$this->tenantNombre}** en Petpilot.")
                ->line('Haz clic en el botón para crear tu contraseña y comenzar a usar la plataforma.')
                ->action('Activar mi cuenta', $url)
                ->line('Este enlace expirará en **60 minutos**.')
                ->line('Si no esperabas este correo, puedes ignorarlo sin problema.');
        } else {
            $message
                ->line('Recibiste este correo porque se solicitó restablecer la contraseña de tu cuenta.')
                ->action('Restablecer contraseña', $url)
                ->line('Este enlace expirará en **60 minutos**.')
                ->line('Si no solicitaste esto, puedes ignorar este correo.');
        }

        return $message->salutation('Petpilot');
    }
}
