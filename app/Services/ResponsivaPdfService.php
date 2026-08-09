<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\PosTicketConfig;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Facades\Storage;

class ResponsivaPdfService
{
    /**
     * Arma el PDF de la responsiva firmada (tamaño carta), con los mismos
     * datos generales del negocio que usa RecetaPdfService (logo, dirección,
     * teléfono — Configuración → General) más el texto legal que se le
     * mostró al dueño y la imagen de su firma.
     */
    public static function build(Appointment $appointment): DomPdf
    {
        $appointment->loadMissing('pet:id,nombre', 'owner:id,nombre,apellidos');
        $tenant = app('current_tenant');
        $config = PosTicketConfig::first();

        $logo = null;
        if ($config?->logo_path) {
            try {
                $disk = Storage::disk(media_disk());
                $logo = 'data:' . ($disk->mimeType($config->logo_path) ?: 'image/png') . ';base64,' . base64_encode($disk->get($config->logo_path));
            } catch (\Throwable) {
                $logo = null;
            }
        }

        $firma = null;
        if ($appointment->responsiva_firma_path) {
            try {
                $disk = Storage::disk(media_disk());
                $firma = 'data:' . ($disk->mimeType($appointment->responsiva_firma_path) ?: 'image/png') . ';base64,' . base64_encode($disk->get($appointment->responsiva_firma_path));
            } catch (\Throwable) {
                $firma = null;
            }
        }

        return Pdf::loadView('pdf.responsiva', [
            'negocio' => [
                'nombre'    => $tenant->nombre,
                'direccion' => $tenant->getSetting('receta.direccion'),
                'telefono'  => $tenant->getSetting('receta.telefono'),
                'logo'      => $logo,
            ],
            'paciente' => [
                'mascota' => $appointment->pet?->nombre,
                'dueño'   => $appointment->owner ? trim("{$appointment->owner->nombre} {$appointment->owner->apellidos}") : null,
                'fecha'   => $appointment->fecha->translatedFormat('d \\d\\e F \\d\\e Y'),
            ],
            'texto'    => $appointment->responsiva_texto,
            'firma'    => $firma,
            'firmante' => $appointment->responsiva_firmante_nombre,
            'firmado_at' => $appointment->responsiva_firmado_at?->translatedFormat('d/m/Y H:i'),
        ])->setPaper('letter');
    }
}
