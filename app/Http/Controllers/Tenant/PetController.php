<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AppointmentPhoto;
use App\Models\ChecklistItem;
use App\Models\EventType;
use App\Models\HotelStay;
use App\Models\HotelStayPhoto;
use App\Models\Membership;
use App\Models\Owner;
use App\Models\Pet;
use App\Models\PetFile;
use App\Models\Raza;
use App\Models\WalkBooking;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PetController extends Controller
{
    public function create(Owner $owner): Response
    {
        return Inertia::render('Pets/Create', [
            'owner' => [
                'id' => $owner->id,
                'nombre' => $owner->nombre,
                'apellidos' => $owner->apellidos,
                'nombre_completo' => $owner->nombre_completo,
            ],
            'razasCustom' => Raza::orderBy('nombre')->get(['nombre', 'tipo']),
        ]);
    }

    public function store(Request $request, Owner $owner): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'raza' => 'nullable|string|max:100',
            'tipo' => 'required|in:perro,gato,roedor,reptil,otro',
            'tamanio' => 'nullable|in:pequeño,mediano,grande',
            'sexo' => 'nullable|in:macho,hembra',
            'esterilizado' => 'boolean',
            'peso' => 'nullable|numeric|min:0|max:999',
            'nivel_agresividad' => 'required|in:tranquilo,precaucion,agresivo',
            'fecha_nacimiento' => 'nullable|date|before:today',
            'alergias' => 'nullable|string',
            'padecimientos' => 'nullable|string',
            'obs_comportamiento' => 'nullable|string',
            'num_expediente' => 'nullable|string|max:50',
        ]);

        $pet = Pet::create($data + [
            'owner_id' => $owner->id,
            'estado' => 'activo',
        ]);

        return redirect()->route('pets.show', $pet)
            ->with('success', "{$pet->nombre} registrado correctamente.");
    }

    public function show(Pet $pet): Response
    {
        $pet->load([
            'owner:id,nombre,apellidos,telefono',
            'events.eventType:id,nombre',
            'events' => fn($q) => $q->latest('fecha')->limit(50),
        ]);

        $hotelStays = HotelStay::where('pet_id', $pet->id)
            ->whereNotIn('estado', ['cancelado'])
            ->orderByDesc('fecha_entrada')
            ->limit(50)
            ->get(['id', 'tipo', 'estado', 'fecha_entrada', 'fecha_salida', 'notas', 'cobro_membresia']);

        $walkBookings = WalkBooking::where('pet_id', $pet->id)
            ->whereNotIn('estado', ['cancelado'])
            ->with('slot:id,fecha,hora_inicio,estado')
            ->get(['id', 'slot_id', 'estado', 'notas', 'cobro_membresia'])
            ->sortByDesc(fn($b) => $b->slot?->fecha)
            ->take(50)
            ->values();

        $activeMemberships = Membership::with(['plan:id,nombre,precio,vigencia_dias', 'credits'])
            ->where('pet_id', $pet->id)
            ->where('activa', true)
            ->orderBy('fecha_inicio')
            ->get();

        $eventTypes = EventType::orderBy('nombre')->get(['id', 'nombre']);
        $checklistItems = ChecklistItem::where('activo', true)->orderBy('orden')->get(['id', 'nombre']);

        // Build media gallery
        $media = [];

        if ($pet->foto_url) {
            $media[] = [
                'id'          => 'perfil',
                'url'         => Storage::disk(media_disk())->url($pet->foto_url),
                'tipo'        => 'perfil',
                'fecha'       => null,
                'descripcion' => 'Foto de perfil',
            ];
        }

        $apptPhotos = AppointmentPhoto::whereHas('appointment', fn($q) => $q->where('pet_id', $pet->id))
            ->with('appointment:id,fecha')
            ->orderByDesc('id')
            ->get();
        foreach ($apptPhotos as $p) {
            $media[] = [
                'id'          => 'appt-' . $p->id,
                'url'         => Storage::disk(media_disk())->url($p->ruta),
                'tipo'        => 'grooming',
                'fecha'       => $p->appointment?->fecha?->toDateString(),
                'descripcion' => $p->descripcion,
            ];
        }

        $hotelPhotos = HotelStayPhoto::whereHas('stay', fn($q) => $q->where('pet_id', $pet->id))
            ->with('stay:id,fecha_entrada')
            ->orderByDesc('id')
            ->get();
        foreach ($hotelPhotos as $p) {
            $media[] = [
                'id'          => 'hotel-' . $p->id,
                'url'         => Storage::disk(media_disk())->url($p->url),
                'tipo'        => 'hotel',
                'fecha'       => $p->stay?->fecha_entrada?->toDateString(),
                'descripcion' => $p->etiqueta,
            ];
        }

        $petFiles = PetFile::where('pet_id', $pet->id)
            ->where('tipo_mime', 'like', 'image/%')
            ->with('event:id,fecha')
            ->orderByDesc('id')
            ->get();
        foreach ($petFiles as $f) {
            $media[] = [
                'id'          => 'file-' . $f->id,
                'url'         => Storage::disk(media_disk())->url($f->archivo_url),
                'tipo'        => 'consulta',
                'fecha'       => $f->event?->fecha?->toDateString(),
                'descripcion' => $f->nombre,
            ];
        }

        usort($media, fn($a, $b) => strcmp($b['fecha'] ?? '', $a['fecha'] ?? ''));

        $mapMembership = fn($m) => $m ? [
            'id' => $m->id,
            'plan' => $m->plan ? ['id' => $m->plan->id, 'nombre' => $m->plan->nombre] : null,
            'fecha_inicio' => $m->fecha_inicio,
            'fecha_vencimiento' => $m->fecha_vencimiento,
            'activa' => $m->activa,
            'congelada' => $m->congelada,
            'credits' => $m->credits->map(fn($c) => [
                'servicio_tipo' => $c->servicio_tipo,
                'saldo_actual' => $c->saldo_actual,
                'saldo_inicial' => $c->saldo_inicial,
            ]),
        ] : null;

        return Inertia::render('Pets/Show', [
            'pet' => array_merge($pet->toArray(), [
                'foto_url'              => $pet->foto_url ? Storage::disk(media_disk())->url($pet->foto_url) : null,
                'recordatorio_vacuna'   => $pet->recordatorio_vacuna?->toDateString(),
                'recordatorio_despa'    => $pet->recordatorio_despa?->toDateString(),
                'recordatorio_consulta' => $pet->recordatorio_consulta?->toDateString(),
                'recordatorio_estetica' => $pet->recordatorio_estetica?->toDateString(),
            ]),
            'activeMembership' => $mapMembership($activeMemberships->first()),
            'activeMemberships' => $activeMemberships->map($mapMembership),
            'eventTypes' => $eventTypes,
            'checklistItems' => $checklistItems,
            'hotelStays' => $hotelStays->map(fn($s) => [
                'id'            => $s->id,
                'tipo'          => $s->tipo,
                'estado'        => $s->estado,
                'fecha_entrada' => $s->fecha_entrada?->toDateString(),
                'fecha_salida'  => $s->fecha_salida?->toDateString(),
                'notas'         => $s->notas,
                'cobro_membresia' => $s->cobro_membresia,
            ]),
            'walkBookings' => $walkBookings->map(fn($b) => [
                'id'     => $b->id,
                'estado' => $b->estado,
                'notas'  => $b->notas,
                'cobro_membresia' => $b->cobro_membresia,
                'fecha'  => $b->slot?->fecha?->toDateString(),
                'hora_inicio' => $b->slot?->hora_inicio,
                'slot_id' => $b->slot_id,
            ]),
            'media' => $media,
        ]);
    }

    public function updateRecordatorios(Request $request, Pet $pet): RedirectResponse
    {
        $data = $request->validate([
            'recordatorio_vacuna'   => 'nullable|date',
            'recordatorio_despa'    => 'nullable|date',
            'recordatorio_consulta' => 'nullable|date',
            'recordatorio_estetica' => 'nullable|date',
        ]);

        $pet->update($data);

        return back()->with('success', 'Recordatorios actualizados.');
    }

    public function edit(Pet $pet): Response
    {
        return Inertia::render('Pets/Edit', [
            'pet'         => $pet->load('owner:id,nombre,apellidos'),
            'razasCustom' => Raza::orderBy('nombre')->get(['nombre', 'tipo']),
        ]);
    }

    public function update(Request $request, Pet $pet): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'raza' => 'nullable|string|max:100',
            'tipo' => 'required|in:perro,gato,roedor,reptil,otro',
            'tamanio' => 'nullable|in:pequeño,mediano,grande',
            'sexo' => 'nullable|in:macho,hembra',
            'esterilizado' => 'boolean',
            'peso' => 'nullable|numeric|min:0|max:999',
            'nivel_agresividad' => 'required|in:tranquilo,precaucion,agresivo',
            'fecha_nacimiento' => 'nullable|date|before:today',
            'alergias' => 'nullable|string',
            'padecimientos' => 'nullable|string',
            'obs_comportamiento' => 'nullable|string',
            'num_expediente' => 'nullable|string|max:50',
            'estado' => 'required|in:activo,inactivo',
        ]);

        $pet->update($data);

        return back()->with('success', 'Mascota actualizada.');
    }

    public function storePhoto(Request $request, Pet $pet): RedirectResponse
    {
        $request->validate(['foto' => 'required|image|max:20480']);

        if ($pet->foto_url) {
            Storage::disk(media_disk())->delete($pet->foto_url);
        }

        $path = $request->file('foto')->store("pets/{$pet->id}", media_disk());
        $pet->update(['foto_url' => $path]);

        return back()->with('success', 'Foto actualizada.');
    }

    public function destroyPhoto(Pet $pet): RedirectResponse
    {
        if ($pet->foto_url) {
            Storage::disk(media_disk())->delete($pet->foto_url);
            $pet->update(['foto_url' => null]);
        }

        return back()->with('success', 'Foto eliminada.');
    }

    public function destroy(Pet $pet): RedirectResponse
    {
        $ownerId = $pet->owner_id;
        $pet->delete();
        return redirect()->route('owners.show', $ownerId)->with('success', 'Mascota eliminada.');
    }
}
