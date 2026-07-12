<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OwnerPasswordReset extends Notification
{
    public function __construct(
        private string $token,
        private string $tenantSlug,
        private string $tenantNombre,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isActivation = is_null($notifiable->password);

        $url = route('portal.reset-password', [
            'tenant' => $this->tenantSlug,
            'token'  => $this->token,
        ]) . '?email=' . rawurlencode($notifiable->email);

        $message = (new MailMessage)
            ->subject($isActivation
                ? "Activa tu acceso al portal — {$this->tenantNombre}"
                : "Restablece tu contraseña — {$this->tenantNombre}")
            ->greeting("Hola, {$notifiable->nombre}!");

        if ($isActivation) {
            $message
                ->line("El equipo de **{$this->tenantNombre}** te ha habilitado el acceso al portal de clientes.")
                ->line("Haz clic en el botón para crear tu contraseña y acceder a tu historial de mascotas.")
                ->action('Activar mi cuenta', $url)
                ->line('Este enlace expirará en **60 minutos**.')
                ->line('Si no esperabas este correo, puedes ignorarlo sin problema.');
        } else {
            $message
                ->line("Recibiste este correo porque se solicitó restablecer la contraseña de tu cuenta en **{$this->tenantNombre}**.")
                ->action('Restablecer contraseña', $url)
                ->line('Este enlace expirará en **60 minutos**.')
                ->line('Si no solicitaste esto, puedes ignorar este correo.');
        }

        return $message;
    }
}
