<?php

namespace App\Services;

use App\Models\PosTicketConfig;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Facades\Storage;

class RecetaPdfService
{
    /**
     * Arma el PDF de receta (tamaño carta) con los datos generales del
     * negocio (logo, dirección, cédula, veterinario — configurados en
     * Configuración → General) y los datos del paciente/consulta que se
     * le pasen. Se usa tanto para la receta real de una visita como para
     * el PDF de muestra en Configuración → Recetas.
     */
    public static function build(array $paciente, array $rec): DomPdf
    {
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

        return Pdf::loadView('pdf.receta', [
            'negocio' => [
                'nombre'      => $tenant->nombre,
                'direccion'   => $tenant->getSetting('receta.direccion'),
                'telefono'    => $tenant->getSetting('receta.telefono'),
                'cedula'      => $tenant->getSetting('receta.cedula_profesional'),
                'veterinario' => $tenant->getSetting('receta.nombre_veterinario'),
                'logo'        => $logo,
            ],
            'paciente' => $paciente,
            'rec'      => $rec,
        ])->setPaper('letter');
    }
}
