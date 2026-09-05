<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\CollectionBooking;
use App\Models\HotelStay;
use App\Models\PosTicketConfig;
use App\Models\Tenant;
use App\Models\WalkBooking;
use App\Services\ResponsivaPdfService;
use App\Services\ResponsivaService;
use App\Support\ResponsivaTextos;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicResponsivaController extends Controller
{
    /** Busca el responsable (Appointment/HotelStay/WalkBooking/CollectionBooking) dueño del token — es único entre las 4 tablas. */
    private function findByToken(string $token): Appointment|HotelStay|WalkBooking|CollectionBooking
    {
        $responsable = Appointment::withoutGlobalScopes()->where('responsiva_token', $token)->first()
            ?? HotelStay::withoutGlobalScopes()->where('responsiva_token', $token)->first()
            ?? WalkBooking::withoutGlobalScopes()->where('responsiva_token', $token)->first()
            ?? CollectionBooking::withoutGlobalScopes()->where('responsiva_token', $token)->first();

        abort_if(! $responsable, 404);

        return $responsable;
    }

    private function moduloDe(Appointment|HotelStay|WalkBooking|CollectionBooking $responsable): string
    {
        return match (true) {
            $responsable instanceof Appointment => $responsable->modulo,
            $responsable instanceof HotelStay => 'hotel',
            $responsable instanceof WalkBooking => 'paseos',
            $responsable instanceof CollectionBooking => 'recoleccion',
        };
    }

    public function show(string $token): Response
    {
        $responsable = $this->findByToken($token);
        $modulo = $this->moduloDe($responsable);
        $context = ResponsivaService::resolveContext($responsable);

        $tenant = Tenant::find($responsable->tenant_id);

        $config = PosTicketConfig::withoutGlobalScopes()
            ->where('tenant_id', $responsable->tenant_id)
            ->first();

        return Inertia::render('Public/Responsiva', [
            'negocio' => [
                'nombre'  => $tenant?->nombre,
                'logo_url' => media_url($config?->logo_path),
                'color_primario' => $config?->color_primario ?? '#4f46e5',
            ],
            'appointment' => [
                'pet'   => $context['pet']?->nombre,
                'owner' => $context['owner'] ? trim("{$context['owner']->nombre} {$context['owner']->apellidos}") : null,
                'fecha' => $context['fecha'] ? \Carbon\Carbon::parse($context['fecha'])->toDateString() : null,
                'servicio' => ResponsivaTextos::label($modulo),
            ],
            'texto'      => $responsable->responsiva_texto,
            'recepcion'  => ResponsivaPdfService::recepcionResumen($responsable),
            'token'      => $token,
            'firmado'    => (bool) $responsable->responsiva_firmado_at,
            'firmado_at' => $responsable->responsiva_firmado_at?->toDateTimeString(),
            'firmante'   => $responsable->responsiva_firmante_nombre,
        ]);
    }

    public function sign(Request $request, string $token): RedirectResponse
    {
        $responsable = $this->findByToken($token);

        abort_if($responsable->responsiva_firmado_at, 422, 'Esta responsiva ya fue firmada.');

        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'firma'  => 'required|string',
        ]);

        if (! preg_match('/^data:image\/png;base64,(.+)$/', $data['firma'], $matches)) {
            return back()->withErrors(['firma' => 'Firma inválida.']);
        }

        $binary = base64_decode($matches[1]);
        $path = 'responsivas/' . class_basename($responsable) . "/{$responsable->id}/firma.png";
        Storage::disk(media_disk())->put($path, $binary);

        $responsable::withoutGlobalScopes()->where('id', $responsable->id)->update([
            'responsiva_firma_path'      => $path,
            'responsiva_firmante_nombre' => $data['nombre'],
            'responsiva_firmado_at'      => now(),
        ]);

        return back()->with('success', 'Responsiva firmada correctamente.');
    }
}
