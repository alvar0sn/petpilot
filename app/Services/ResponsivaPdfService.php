<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\PosTicketConfig;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Facades\Storage;

class ResponsivaPdfService
{
    private const ANALISIS_LABELS = [
        'verrugas'          => 'Verrugas',
        'pulgas_garrapatas' => 'Pulgas / garrapatas',
        'secreciones'       => 'Secreciones',
        'lesiones'          => 'Lesiones',
        'alergias_visibles' => 'Alergias visibles',
        'nudos_severos'     => 'Nudos severos',
    ];

    private const ESTADO_MANTO_LABELS = [
        'bueno'        => 'Bueno',
        'regular'      => 'Regular',
        'enredado'     => 'Enredado',
        'muy_enredado' => 'Muy enredado',
        'opaco'        => 'Opaco / seco',
    ];

    /**
     * Resumen legible del formulario de recepción, usado tanto en el PDF
     * (staff) como en la página pública de firma (dueño) — así el dueño ve
     * exactamente las mismas condiciones documentadas que quedan en el
     * comprobante.
     */
    public static function recepcionResumen(Appointment $appointment): array
    {
        $rec = $appointment->recepcion ?? [];

        return [
            'hallazgos'    => collect(self::ANALISIS_LABELS)
                ->filter(fn($label, $key) => ! empty($rec[$key]))
                ->values()
                ->all(),
            'estado_manto' => self::ESTADO_MANTO_LABELS[$rec['estado_manto'] ?? ''] ?? null,
            'accesorios'   => $appointment->accesorios,
            'notas_sesion' => $rec['notas_sesion'] ?? null,
        ];
    }

    /**
     * Arma el PDF de la responsiva firmada (tamaño carta), con los mismos
     * datos generales del negocio que usa RecetaPdfService (logo, dirección,
     * teléfono — Configuración → General), el texto legal que se le mostró
     * al dueño, la imagen de su firma, y los hallazgos del formulario de
     * recepción (análisis visual, estado del manto, notas) — quedan como
     * evidencia documentada de las condiciones de la mascota al momento de
     * recibirla, junto con la firma de exención de responsabilidad.
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
            'recepcion' => self::recepcionResumen($appointment),
        ])->setPaper('letter');
    }
}
