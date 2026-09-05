<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\CollectionBooking;
use App\Models\HotelStay;
use App\Models\WalkBooking;
use App\Support\ResponsivaTextos;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Orquesta el envío/firma/descarga de la carta responsiva para los distintos
 * modelos que la usan (Appointment de grooming/entrenamiento, HotelStay,
 * WalkBooking, CollectionBooking) — cada uno guarda sus propias columnas
 * responsiva_* pero comparten el mismo flujo (token, texto legal, webhook,
 * WhatsApp, PDF).
 */
class ResponsivaService
{
    private const TOKEN_TABLES = ['appointments', 'hotel_stays', 'walk_bookings', 'collection_bookings'];

    public static function send(Appointment|HotelStay|WalkBooking|CollectionBooking $responsable, string $modulo): string
    {
        $tenant = app('current_tenant');

        if (! $responsable->responsiva_token) {
            $responsable->responsiva_token = self::generateToken();
        }

        $responsable->responsiva_texto = $tenant->getSetting(ResponsivaTextos::settingKey($modulo)) ?: ResponsivaTextos::default($modulo);
        $responsable->responsiva_enviado_at = now();
        $responsable->save();

        $url = url("/r/{$responsable->responsiva_token}");
        $context = self::resolveContext($responsable);
        $pet = $context['pet'];
        $owner = $context['owner'];

        app(GhlService::class)->sendWebhook($tenant->id, 'responsiva', [
            'tipo'            => 'responsiva',
            'ghl_contact_id'  => $owner?->ghl_contact_id,
            'owner_nombre'    => $owner?->nombre,
            'owner_apellidos' => $owner?->apellidos,
            'owner_telefono'  => $owner?->telefono,
            'owner_email'     => $owner?->email,
            'negocio'         => $tenant->nombre,
            'pet_nombre'      => $pet?->nombre,
            'responsiva_url'  => $url,
        ]);

        if ($owner) {
            WhatsappGatewayService::send($tenant, 'responsiva', $owner, [
                'pet_name'       => $pet?->nombre ?? '',
                'responsiva_url' => $url,
            ], 'responsiva:' . class_basename($responsable) . ":{$responsable->id}");
        }

        return $url;
    }

    public static function download(Appointment|HotelStay|WalkBooking|CollectionBooking $responsable): Response
    {
        abort_unless($responsable->responsiva_firmado_at, 404);

        if ($responsable instanceof Appointment && $responsable->modulo === 'grooming') {
            abort_unless($responsable->recepcion, 422, 'Completa el formulario de recepción antes de descargar la responsiva.');
        }

        $context = self::resolveContext($responsable);

        $pdf = ResponsivaPdfService::build($responsable);
        $fecha = $context['fecha'] ? Carbon::parse($context['fecha'])->toDateString() : now()->toDateString();
        $filename = 'responsiva-' . Str::slug($context['pet']?->nombre ?? 'mascota') . '-' . $fecha . '.pdf';

        return $pdf->download($filename);
    }

    /** @return array{pet: ?\App\Models\Pet, owner: ?\App\Models\Owner, fecha: mixed} */
    public static function resolveContext(Appointment|HotelStay|WalkBooking|CollectionBooking $responsable): array
    {
        if ($responsable instanceof Appointment) {
            $responsable->loadMissing(['pet:id,nombre,owner_id', 'owner:id,nombre,apellidos,telefono,email,ghl_contact_id']);

            return ['pet' => $responsable->pet, 'owner' => $responsable->owner, 'fecha' => $responsable->fecha];
        }

        if ($responsable instanceof HotelStay) {
            $responsable->loadMissing(['pet:id,nombre,owner_id', 'pet.owner:id,nombre,apellidos,telefono,email,ghl_contact_id']);

            return ['pet' => $responsable->pet, 'owner' => $responsable->pet?->owner, 'fecha' => $responsable->fecha_entrada];
        }

        // WalkBooking y CollectionBooking
        $responsable->loadMissing(['pet:id,nombre', 'owner:id,nombre,apellidos,telefono,email,ghl_contact_id', 'slot:id,fecha']);

        return ['pet' => $responsable->pet, 'owner' => $responsable->owner, 'fecha' => $responsable->slot?->fecha];
    }

    public static function generateToken(): string
    {
        do {
            $token = Str::random(10);
        } while (self::tokenExists($token));

        return $token;
    }

    private static function tokenExists(string $token): bool
    {
        foreach (self::TOKEN_TABLES as $table) {
            if (DB::table($table)->where('responsiva_token', $token)->exists()) {
                return true;
            }
        }

        return false;
    }
}
