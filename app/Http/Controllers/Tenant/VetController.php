<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\AppointmentPhoto;
use App\Models\Event;
use App\Models\EventType;
use App\Models\Pet;
use App\Models\PosConfig;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class VetController extends Controller
{
    public function index(Request $request): Response
    {
        $tenant = app('current_tenant');
        $tz = $tenant->timezone ?? 'America/Mexico_City';

        $weekStart = $request->input('week_start')
            ? Carbon::parse($request->input('week_start'))->startOfDay()
            : Carbon::now($tz)->startOfWeek(Carbon::MONDAY);

        $weekEnd = $weekStart->copy()->addDays(6)->endOfDay();

        $appointments = Appointment::with([
            'pet:id,nombre,owner_id',
            'pet.owner:id,nombre,apellidos',
            'groomer:id,nombre,apellido',
        ])
            ->where('modulo', 'veterinaria')
            ->whereBetween('fecha', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn(Appointment $a) => [
                'id'           => $a->id,
                'fecha'        => $a->fecha->toDateString(),
                'hora_inicio'  => $a->hora_inicio,
                'hora_fin'     => $a->hora_fin,
                'estado'       => $a->estado,
                'pet'          => $a->pet?->nombre,
                'owner'        => $a->pet?->owner?->nombre_completo,
                'veterinario'  => $a->groomer ? trim($a->groomer->nombre . ' ' . $a->groomer->apellido) : null,
                'notas_internas' => $a->notas_internas,
            ]);

        return Inertia::render('Vet/Index', [
            'appointments' => $appointments,
            'weekStart'    => $weekStart->toDateString(),
            'veterinarios' => User::where('tenant_id', $tenant->id)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'apellido']),
            'catalogItems' => \App\Models\PosCatalogItem::whereHas('categoria', fn($q) => $q->where('es_grooming', true))
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'precio']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id'         => 'required|exists:pets,id',
            'fecha'          => 'required|date',
            'hora_inicio'    => 'required|date_format:H:i',
            'hora_fin'       => 'nullable|date_format:H:i|after:hora_inicio',
            'veterinario_id' => 'nullable|exists:users,id',
            'notas_internas' => 'nullable|string|max:1000',
            'items'          => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre'  => 'required|string|max:255',
            'items.*.precio'  => 'required|numeric|min:0',
            'items.*.cantidad' => 'nullable|numeric|min:0.01',
        ]);

        $pet = Pet::findOrFail($data['pet_id']);
        $consultaType = EventType::where('nombre', 'Consulta')->first();

        DB::transaction(function () use ($data, $pet, $consultaType) {
            $appointment = Appointment::create([
                'pet_id'           => $pet->id,
                'owner_id'         => $pet->owner_id,
                'tipo_servicio_id' => $consultaType?->id,
                'fecha'            => $data['fecha'],
                'hora_inicio'      => $data['hora_inicio'],
                'hora_fin'         => $data['hora_fin'] ?? null,
                'estado'           => 'pendiente',
                'modulo'           => 'veterinaria',
                'groomer_id'       => $data['veterinario_id'] ?? null,
                'notas_internas'   => $data['notas_internas'] ?? null,
                'created_via'      => 'operador',
                'created_by'       => auth()->id(),
            ]);

            foreach ($data['items'] ?? [] as $item) {
                AppointmentItem::create([
                    'appointment_id'  => $appointment->id,
                    'catalog_item_id' => $item['catalog_item_id'] ?? null,
                    'nombre'          => $item['nombre'],
                    'precio'          => $item['precio'],
                    'cantidad'        => $item['cantidad'] ?? 1,
                ]);
            }
        });

        return redirect()->route('vet.index', ['week_start' => $data['fecha']])
            ->with('success', "Consulta agendada para {$pet->nombre}.");
    }

    public function show(Appointment $appointment): Response
    {
        $tenant = app('current_tenant');

        $appointment->load([
            'pet:id,nombre,owner_id,peso',
            'pet.owner:id,nombre,apellidos,telefono',
            'groomer:id,nombre,apellido',
            'items.catalogItem:id,nombre',
            'photos',
            'ticket:id,folio,estado',
        ]);

        $linkedEvents = Event::with('eventType:id,nombre')
            ->where('appointment_id', $appointment->id)
            ->get()
            ->map(fn($e) => [
                'id'            => $e->id,
                'tipo'          => $e->eventType?->nombre,
                'fecha'         => $e->fecha?->toDateString(),
                'vacuna_nombre' => $e->vacuna_nombre,
                'despa_producto' => $e->despa_producto,
                'proximo_recordatorio' => $e->proximo_recordatorio?->toDateString(),
            ]);

        return Inertia::render('Vet/Show', [
            'appointment' => [
                'id'              => $appointment->id,
                'fecha'           => $appointment->fecha->toDateString(),
                'hora_inicio'     => $appointment->hora_inicio,
                'hora_fin'        => $appointment->hora_fin,
                'estado'          => $appointment->estado,
                'notas_internas'  => $appointment->notas_internas,
                'recepcion'       => $appointment->recepcion,
                'created_via'     => $appointment->created_via,
                'pet'             => $appointment->pet ? [
                    'id'                => $appointment->pet->id,
                    'nombre'            => $appointment->pet->nombre,
                    'tipo'              => $appointment->pet->tipo,
                    'raza'              => $appointment->pet->raza,
                    'sexo'              => $appointment->pet->sexo,
                    'esterilizado'      => $appointment->pet->esterilizado,
                    'tamanio'           => $appointment->pet->tamanio,
                    'peso'              => $appointment->pet->peso,
                    'fecha_nacimiento'  => $appointment->pet->fecha_nacimiento?->toDateString(),
                    'nivel_agresividad' => $appointment->pet->nivel_agresividad,
                    'alergias'          => $appointment->pet->alergias,
                    'padecimientos'     => $appointment->pet->padecimientos,
                    'obs_comportamiento'=> $appointment->pet->obs_comportamiento,
                ] : null,
                'owner' => $appointment->pet?->owner ? [
                    'id'       => $appointment->pet->owner->id,
                    'nombre'   => $appointment->pet->owner->nombre_completo,
                    'telefono' => $appointment->pet->owner->telefono,
                ] : null,
                'veterinario' => $appointment->groomer ? [
                    'id'     => $appointment->groomer->id,
                    'nombre' => trim($appointment->groomer->nombre . ' ' . $appointment->groomer->apellido),
                ] : null,
                'items' => $appointment->items->map(fn($i) => [
                    'id'             => $i->id,
                    'nombre'         => $i->nombre,
                    'precio'         => $i->precio,
                    'cantidad'       => $i->cantidad,
                    'catalog_item_id' => $i->catalog_item_id,
                ]),
                'photos' => $appointment->photos->map(fn($p) => [
                    'id'          => $p->id,
                    'url'         => Storage::disk(media_disk())->url($p->ruta),
                    'tipo'        => $p->tipo,
                    'descripcion' => $p->descripcion,
                ]),
                'ticket_folio' => $appointment->ticket?->folio,
                'ticket_id'    => $appointment->pos_ticket_id,
                'has_events'   => $linkedEvents->isNotEmpty(),
                'linked_events' => $linkedEvents,
            ],
            'veterinarios' => User::where('tenant_id', $tenant->id)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'apellido']),
            'catalogItems' => \App\Models\PosCatalogItem::whereHas('categoria', fn($q) => $q->where('es_grooming', true))
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'precio']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'Solo se pueden editar citas pendientes o confirmadas.');

        $data = $request->validate([
            'fecha'          => 'required|date',
            'hora_inicio'    => 'required|date_format:H:i',
            'hora_fin'       => 'nullable|date_format:H:i|after:hora_inicio',
            'veterinario_id' => 'nullable|exists:users,id',
            'notas_internas' => 'nullable|string|max:1000',
            'items'          => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre'  => 'required|string|max:255',
            'items.*.precio'  => 'required|numeric|min:0',
            'items.*.cantidad' => 'nullable|numeric|min:0.01',
        ]);

        DB::transaction(function () use ($appointment, $data) {
            $appointment->update([
                'fecha'          => $data['fecha'],
                'hora_inicio'    => $data['hora_inicio'],
                'hora_fin'       => $data['hora_fin'] ?? null,
                'groomer_id'     => $data['veterinario_id'] ?? null,
                'notas_internas' => $data['notas_internas'] ?? null,
            ]);

            $appointment->items()->delete();

            foreach ($data['items'] ?? [] as $item) {
                AppointmentItem::create([
                    'appointment_id'  => $appointment->id,
                    'catalog_item_id' => $item['catalog_item_id'] ?? null,
                    'nombre'          => $item['nombre'],
                    'precio'          => $item['precio'],
                    'cantidad'        => $item['cantidad'] ?? 1,
                ]);
            }
        });

        return back()->with('success', 'Consulta actualizada.');
    }

    public function confirm(Appointment $appointment): RedirectResponse
    {
        abort_unless($appointment->estado === 'pendiente', 422, 'Solo se pueden confirmar citas pendientes.');
        $appointment->update(['estado' => 'confirmada']);
        return back()->with('success', 'Consulta confirmada.');
    }

    public function storeRecepcion(Request $request, Appointment $appointment): RedirectResponse
    {
        $data = $request->validate([
            'peso'               => 'nullable|numeric|min:0|max:999',
            'temperatura'        => 'nullable|numeric|min:0|max:50',
            'motivo'             => 'nullable|string|max:500',
            'diagnostico'        => 'nullable|string|max:2000',
            'medicamentos'       => 'nullable|string|max:2000',
            'notas'              => 'nullable|string|max:2000',
            'vacuna'             => 'boolean',
            'vacuna_nombre'      => 'nullable|string|max:100',
            'vacuna_lote'        => 'nullable|string|max:50',
            'vacuna_laboratorio' => 'nullable|string|max:100',
            'vacuna_proxima'     => 'nullable|date',
            'despa'              => 'boolean',
            'despa_producto'     => 'nullable|string|max:100',
            'despa_via'          => 'nullable|string|max:50',
            'despa_proxima'      => 'nullable|date',
            'consulta_proxima'   => 'nullable|date',
        ]);

        $appointment->update(['recepcion' => $data]);

        $petUpdates = [];
        if (!empty($data['peso']))             $petUpdates['peso'] = $data['peso'];
        if (!empty($data['vacuna_proxima']))   $petUpdates['recordatorio_vacuna'] = $data['vacuna_proxima'];
        if (!empty($data['despa_proxima']))    $petUpdates['recordatorio_despa'] = $data['despa_proxima'];
        if (!empty($data['consulta_proxima'])) $petUpdates['recordatorio_consulta'] = $data['consulta_proxima'];
        if (!empty($petUpdates)) {
            Pet::where('id', $appointment->pet_id)->update($petUpdates);
        }

        return back()->with('success', 'Ficha de atención guardada.');
    }

    public function complete(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'Solo se pueden completar citas pendientes o confirmadas.');

        $rec = $appointment->recepcion ?? [];
        $ticket = null;

        DB::transaction(function () use ($appointment, $rec, &$ticket) {
            $appointment->update(['estado' => 'completada']);

            $consultaType   = EventType::where('nombre', 'Consulta')->first();
            $vacunaType     = EventType::where('nombre', 'Vacuna')->first();
            $despaType      = EventType::where('nombre', 'Desparasitación')->first();

            $consulta = Event::create([
                'pet_id'               => $appointment->pet_id,
                'event_type_id'        => $consultaType?->id,
                'fecha'                => $appointment->fecha,
                'notas'                => $rec['notas'] ?? null,
                'peso'                 => $rec['peso'] ?? null,
                'proximo_recordatorio' => !empty($rec['consulta_proxima']) ? $rec['consulta_proxima'] : null,
                'appointment_id'       => $appointment->id,
                'created_by'           => auth()->id(),
            ]);

            $appointment->update(['event_id' => $consulta->id]);

            if (!empty($rec['vacuna']) && $vacunaType) {
                Event::create([
                    'pet_id'             => $appointment->pet_id,
                    'event_type_id'      => $vacunaType->id,
                    'fecha'              => $appointment->fecha,
                    'vacuna_nombre'      => $rec['vacuna_nombre'] ?? null,
                    'vacuna_lote'        => $rec['vacuna_lote'] ?? null,
                    'vacuna_laboratorio' => $rec['vacuna_laboratorio'] ?? null,
                    'proximo_recordatorio' => !empty($rec['vacuna_proxima']) ? $rec['vacuna_proxima'] : null,
                    'appointment_id'     => $appointment->id,
                    'created_by'         => auth()->id(),
                ]);
            }

            if (!empty($rec['despa']) && $despaType) {
                Event::create([
                    'pet_id'               => $appointment->pet_id,
                    'event_type_id'        => $despaType->id,
                    'fecha'                => $appointment->fecha,
                    'despa_producto'       => $rec['despa_producto'] ?? null,
                    'despa_via'            => $rec['despa_via'] ?? null,
                    'proximo_recordatorio' => !empty($rec['despa_proxima']) ? $rec['despa_proxima'] : null,
                    'appointment_id'       => $appointment->id,
                    'created_by'           => auth()->id(),
                ]);
            }

            if (!empty($rec['peso'])) {
                Pet::where('id', $appointment->pet_id)->update(['peso' => $rec['peso']]);
            }

            $appointment->load('items');
            if ($appointment->items->isNotEmpty()) {
                $shift = PosShift::where('estado', 'abierto')->first();
                $subtotal = $appointment->items->sum(fn($i) => $i->precio * $i->cantidad);

                $ticket = PosTicket::create([
                    'folio'             => $this->nextFolio(),
                    'owner_id'          => $appointment->owner_id,
                    'estado'            => 'abierto',
                    'shift_open_id'     => $shift?->id,
                    'user_open_id'      => auth()->id(),
                    'user_last_edit_id' => auth()->id(),
                    'subtotal'          => $subtotal,
                    'total'             => $subtotal,
                ]);

                foreach ($appointment->items as $item) {
                    PosTicketLine::create([
                        'ticket_id'        => $ticket->id,
                        'item_id'          => $item->catalog_item_id,
                        'nombre_snapshot'  => $item->nombre,
                        'precio_snapshot'  => $item->precio,
                        'costo_snapshot'   => 0,
                        'cantidad'         => $item->cantidad,
                        'subtotal'         => $item->precio * $item->cantidad,
                    ]);
                }

                $appointment->update(['pos_ticket_id' => $ticket->id]);
            }
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])
                ->with('success', 'Consulta completada. Completa el cobro en POS.')
            : back()->with('success', 'Consulta completada y registrada en historial.');
    }

    public function cancel(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se puede cancelar esta consulta.');
        $appointment->update(['estado' => 'cancelada']);
        return back()->with('success', 'Consulta cancelada.');
    }

    public function noShow(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se puede marcar como no presentado.');
        $appointment->update(['estado' => 'no_show']);
        return back()->with('success', 'Consulta marcada como no presentado.');
    }

    public function storePhoto(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate([
            'foto'        => 'required|image|max:20480',
            'descripcion' => 'nullable|string|max:100',
        ]);

        $path = $request->file('foto')->store("vet/{$appointment->id}", media_disk());

        AppointmentPhoto::create([
            'appointment_id' => $appointment->id,
            'ruta'           => $path,
            'tipo'           => 'recepcion',
            'descripcion'    => $request->input('descripcion'),
        ]);

        return back()->with('success', 'Foto agregada.');
    }

    public function destroyPhoto(Appointment $appointment, AppointmentPhoto $photo): RedirectResponse
    {
        Storage::disk(media_disk())->delete($photo->ruta);
        $photo->delete();
        return back()->with('success', 'Foto eliminada.');
    }

    private function nextFolio(): int
    {
        $config = PosConfig::where('clave', 'folio_siguiente')->first();
        $folio = $config ? (int) $config->valor : 1;
        $config
            ? $config->update(['valor' => $folio + 1])
            : PosConfig::create(['clave' => 'folio_siguiente', 'valor' => $folio + 1]);
        return $folio;
    }
}
