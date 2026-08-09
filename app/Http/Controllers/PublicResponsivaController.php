<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\PosTicketConfig;
use App\Models\Tenant;
use App\Services\ResponsivaPdfService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicResponsivaController extends Controller
{
    public function show(string $token): Response
    {
        $appointment = Appointment::withoutGlobalScopes()
            ->where('responsiva_token', $token)
            ->with(['pet:id,nombre', 'owner:id,nombre,apellidos'])
            ->firstOrFail();

        $tenant = Tenant::find($appointment->tenant_id);

        $config = PosTicketConfig::withoutGlobalScopes()
            ->where('tenant_id', $appointment->tenant_id)
            ->first();

        return Inertia::render('Public/Responsiva', [
            'negocio' => [
                'nombre'  => $tenant?->nombre,
                'logo_url' => $config?->logo_path ? Storage::disk(media_disk())->url($config->logo_path) : null,
                'color_primario' => $config?->color_primario ?? '#4f46e5',
            ],
            'appointment' => [
                'pet'   => $appointment->pet?->nombre,
                'owner' => $appointment->owner ? trim("{$appointment->owner->nombre} {$appointment->owner->apellidos}") : null,
                'fecha' => $appointment->fecha->toDateString(),
            ],
            'texto'      => $appointment->responsiva_texto,
            'recepcion'  => ResponsivaPdfService::recepcionResumen($appointment),
            'token'      => $token,
            'firmado'    => (bool) $appointment->responsiva_firmado_at,
            'firmado_at' => $appointment->responsiva_firmado_at?->toDateTimeString(),
            'firmante'   => $appointment->responsiva_firmante_nombre,
        ]);
    }

    public function sign(Request $request, string $token): RedirectResponse
    {
        $appointment = Appointment::withoutGlobalScopes()
            ->where('responsiva_token', $token)
            ->firstOrFail();

        abort_if($appointment->responsiva_firmado_at, 422, 'Esta responsiva ya fue firmada.');

        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'firma'  => 'required|string',
        ]);

        if (! preg_match('/^data:image\/png;base64,(.+)$/', $data['firma'], $matches)) {
            return back()->withErrors(['firma' => 'Firma inválida.']);
        }

        $binary = base64_decode($matches[1]);
        $path = "responsivas/{$appointment->id}/firma.png";
        Storage::disk(media_disk())->put($path, $binary);

        Appointment::withoutGlobalScopes()->where('id', $appointment->id)->update([
            'responsiva_firma_path'      => $path,
            'responsiva_firmante_nombre' => $data['nombre'],
            'responsiva_firmado_at'      => now(),
        ]);

        return back()->with('success', 'Responsiva firmada correctamente.');
    }
}
