<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\AppointmentPhoto;
use App\Models\Event;
use App\Models\EventType;
use App\Models\GroomingStation;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\Pet;
use App\Models\PosCatalogItem;
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

class AppointmentController extends Controller
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
            'tipoServicio:id,nombre',
            'groomer:id,nombre,apellido',
            'station:id,nombre',
            'items',
        ])
            ->where('modulo', 'grooming')
            ->whereBetween('fecha', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn(Appointment $a) => [
                'id' => $a->id,
                'fecha' => $a->fecha->toDateString(),
                'hora_inicio' => $a->hora_inicio,
                'hora_fin' => $a->hora_fin,
                'estado' => $a->estado,
                'pet' => $a->pet?->nombre,
                'owner' => $a->pet?->owner?->nombre_completo,
                'tipo_servicio' => $a->tipoServicio?->nombre,
                'groomer' => $a->groomer ? trim($a->groomer->nombre . ' ' . $a->groomer->apellido) : null,
                'station' => $a->station?->nombre,
                'notas_internas' => $a->notas_internas,
            ]);

        return Inertia::render('Grooming/Index', [
            'appointments' => $appointments,
            'weekStart' => $weekStart->toDateString(),
            'stations' => GroomingStation::where('activo', true)->orderBy('orden')->get(['id', 'nombre']),
            'eventTypes' => EventType::where('nombre', 'Estética')->get(['id', 'nombre']),
            'groomers' => User::where('tenant_id', $tenant->id)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'apellido']),
            'catalogItems' => PosCatalogItem::whereHas('categoria', fn($q) => $q->where('es_grooming', true))
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'precio']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id'           => 'required|exists:pets,id',
            'tipo_servicio_id' => 'required|exists:event_types,id',
            'fecha'            => 'required|date',
            'hora_inicio'      => 'required|date_format:H:i',
            'hora_fin'         => 'nullable|date_format:H:i|after:hora_inicio',
            'groomer_id'       => 'nullable|exists:users,id',
            'station_id'       => 'nullable|exists:grooming_stations,id',
            'notas_internas'      => 'nullable|string|max:1000',
            'servicio_domicilio'  => 'boolean',
            'direccion_entrega'   => 'nullable|string|max:500',
            'cobro_membresia'     => 'boolean',
            'membership_id'       => 'nullable|exists:memberships,id',
            'items'               => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre'   => 'required|string|max:255',
            'items.*.precio'   => 'required|numeric|min:0',
            'items.*.cantidad' => 'nullable|numeric|min:0.01',
        ]);

        $pet = Pet::findOrFail($data['pet_id']);
        $usaMembresia = !empty($data['cobro_membresia']) && !empty($data['membership_id']);

        $mensaje = "Cita agendada para {$pet->nombre}.";

        DB::transaction(function () use ($data, $pet, $usaMembresia, &$mensaje) {
            $appointment = Appointment::create([
                'pet_id'           => $pet->id,
                'owner_id'         => $pet->owner_id,
                'tipo_servicio_id' => $data['tipo_servicio_id'],
                'fecha'            => $data['fecha'],
                'hora_inicio'      => $data['hora_inicio'],
                'hora_fin'         => $data['hora_fin'] ?? null,
                'estado'           => 'pendiente',
                'modulo'           => 'grooming',
                'groomer_id'       => $data['groomer_id'] ?? null,
                'station_id'       => $data['station_id'] ?? null,
                'notas_internas'     => $data['notas_internas'] ?? null,
                'servicio_domicilio' => !empty($data['servicio_domicilio']),
                'direccion_entrega'  => !empty($data['servicio_domicilio']) ? ($data['direccion_entrega'] ?? null) : null,
                'cobro_membresia'    => $usaMembresia,
                'membership_id'    => $usaMembresia ? $data['membership_id'] : null,
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

            if ($usaMembresia) {
                $membership = Membership::with('credits')->findOrFail($data['membership_id']);
                $credit = $membership->getCredit('estetica');
                if ($credit && $credit->saldo_actual > 0) {
                    $saldoAntes = $credit->saldo_actual;
                    $credit->update(['saldo_actual' => $saldoAntes - 1]);
                    MembershipCreditMovement::create([
                        'membership_id'  => $membership->id,
                        'credit_id'      => $credit->id,
                        'servicio_tipo'  => 'estetica',
                        'tipo'           => 'consumo',
                        'cantidad'       => -1,
                        'saldo_antes'    => $saldoAntes,
                        'saldo_despues'  => $saldoAntes - 1,
                        'referencia_tipo' => 'appointment',
                        'referencia_id'  => $appointment->id,
                        'user_id'        => auth()->id(),
                        'notas'          => "Cita de grooming #{$appointment->id} agendada.",
                    ]);
                    $mensaje = "Cita agendada para {$pet->nombre}. Se descontó 1 crédito de estética (saldo: " . ($saldoAntes - 1) . ").";
                }
            }
        });

        return redirect()->route('grooming.index', ['week_start' => $data['fecha']])
            ->with('success', $mensaje);
    }

    public function show(Appointment $appointment): Response
    {
        $tenant = app('current_tenant');

        $appointment->load([
            'pet:id,nombre,owner_id',
            'pet.owner:id,nombre,apellidos,telefono',
            'tipoServicio:id,nombre',
            'groomer:id,nombre,apellido',
            'station:id,nombre',
            'items.catalogItem:id,nombre',
            'photos',
            'ticket:id,folio,estado',
            'event.checklistItems:id',
            'membership.credits',
        ]);

        return Inertia::render('Grooming/Show', [
            'appointment' => [
                'id' => $appointment->id,
                'fecha' => $appointment->fecha->toDateString(),
                'hora_inicio' => $appointment->hora_inicio,
                'hora_fin' => $appointment->hora_fin,
                'estado' => $appointment->estado,
                'notas_internas' => $appointment->notas_internas,
                'accesorios' => $appointment->accesorios,
                'recepcion' => $appointment->recepcion,
                'created_via' => $appointment->created_via,
                'pet' => [
                    'id' => $appointment->pet?->id,
                    'nombre' => $appointment->pet?->nombre,
                ],
                'owner' => $appointment->pet?->owner ? [
                    'id' => $appointment->pet->owner->id,
                    'nombre' => $appointment->pet->owner->nombre_completo,
                    'telefono' => $appointment->pet->owner->telefono,
                ] : null,
                'tipo_servicio' => $appointment->tipoServicio ? ['id' => $appointment->tipoServicio->id, 'nombre' => $appointment->tipoServicio->nombre] : null,
                'groomer' => $appointment->groomer ? ['id' => $appointment->groomer->id, 'nombre' => trim($appointment->groomer->nombre . ' ' . $appointment->groomer->apellido)] : null,
                'station' => $appointment->station ? ['id' => $appointment->station->id, 'nombre' => $appointment->station->nombre] : null,
                'items' => $appointment->items->map(fn($i) => [
                    'id' => $i->id,
                    'nombre' => $i->nombre,
                    'precio' => $i->precio,
                    'cantidad' => $i->cantidad,
                    'catalog_item_id' => $i->catalog_item_id,
                ]),
                'photos' => $appointment->photos->map(fn($p) => [
                    'id'          => $p->id,
                    'url'         => Storage::disk(media_disk())->url($p->ruta),
                    'tipo'        => $p->tipo,
                    'descripcion' => $p->descripcion,
                ]),
                'ticket_folio'     => $appointment->ticket?->folio,
                'ticket_id'        => $appointment->pos_ticket_id,
                'has_event'        => (bool) $appointment->event_id,
                'checklist_hecho'  => $appointment->event
                    ? $appointment->event->checklistItems->pluck('id')->all()
                    : [],
                'notas_resultado'  => $appointment->event?->notas,
                'cobro_membresia'  => $appointment->cobro_membresia,
                'membership_id'    => $appointment->membership_id,
                'creditos_estetica_saldo' => $appointment->membership?->getCredit('estetica')?->saldo_actual,
            ],
            'stations' => GroomingStation::where('activo', true)->orderBy('orden')->get(['id', 'nombre']),
            'eventTypes' => EventType::where('nombre', 'Estética')->get(['id', 'nombre']),
            'groomers' => User::where('tenant_id', $tenant->id)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'apellido']),
            'catalogItems' => PosCatalogItem::whereHas('categoria', fn($q) => $q->where('es_grooming', true))
                ->where('activo', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'precio']),
            'checklistItems' => \App\Models\ChecklistItem::where('activo', true)->orderBy('orden')->get(['id', 'nombre']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'Solo se pueden editar citas pendientes o confirmadas.');

        $data = $request->validate([
            'tipo_servicio_id' => 'required|exists:event_types,id',
            'fecha' => 'required|date',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin' => 'nullable|date_format:H:i|after:hora_inicio',
            'groomer_id' => 'nullable|exists:users,id',
            'station_id' => 'nullable|exists:grooming_stations,id',
            'notas_internas'     => 'nullable|string|max:1000',
            'accesorios'         => 'nullable|string|max:1000',
            'servicio_domicilio' => 'boolean',
            'direccion_entrega'  => 'nullable|string|max:500',
            'items'              => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre' => 'required|string|max:255',
            'items.*.precio' => 'required|numeric|min:0',
            'items.*.cantidad' => 'nullable|numeric|min:0.01',
        ]);

        DB::transaction(function () use ($appointment, $data) {
            $appointment->update([
                'tipo_servicio_id' => $data['tipo_servicio_id'],
                'fecha' => $data['fecha'],
                'hora_inicio' => $data['hora_inicio'],
                'hora_fin' => $data['hora_fin'] ?? null,
                'groomer_id' => $data['groomer_id'] ?? null,
                'station_id' => $data['station_id'] ?? null,
                'notas_internas'     => $data['notas_internas'] ?? null,
                'accesorios'         => $data['accesorios'] ?? null,
                'servicio_domicilio' => !empty($data['servicio_domicilio']),
                'direccion_entrega'  => !empty($data['servicio_domicilio']) ? ($data['direccion_entrega'] ?? null) : null,
            ]);

            $appointment->items()->delete();

            foreach ($data['items'] ?? [] as $item) {
                AppointmentItem::create([
                    'appointment_id' => $appointment->id,
                    'catalog_item_id' => $item['catalog_item_id'] ?? null,
                    'nombre' => $item['nombre'],
                    'precio' => $item['precio'],
                    'cantidad' => $item['cantidad'] ?? 1,
                ]);
            }
        });

        return back()->with('success', 'Cita actualizada.');
    }

    public function confirm(Appointment $appointment): RedirectResponse
    {
        abort_unless($appointment->estado === 'pendiente', 422, 'Solo se pueden confirmar citas pendientes.');

        $appointment->update(['estado' => 'confirmada']);

        return back()->with('success', 'Cita confirmada.');
    }

    public function complete(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'Solo se pueden completar citas pendientes o confirmadas.');

        $data = $request->validate([
            'checklist_items'   => 'nullable|array',
            'checklist_items.*' => 'integer|exists:checklist_items,id',
            'notas_resultado'   => 'nullable|string|max:2000',
            'proxima_estetica'  => 'nullable|date',
        ]);

        $ticket = null;

        DB::transaction(function () use ($appointment, $data, &$ticket) {
            $appointment->update(['estado' => 'completada']);

            // Poblar est_* desde el formulario de recepción guardado
            $rec = $appointment->recepcion ?? [];

            $event = Event::create([
                'pet_id'               => $appointment->pet_id,
                'event_type_id'        => $appointment->tipo_servicio_id,
                'fecha'                => $appointment->fecha,
                'notas'                => $data['notas_resultado'] ?? null,
                'proximo_recordatorio' => !empty($data['proxima_estetica']) ? $data['proxima_estetica'] : null,
                'appointment_id'       => $appointment->id,
                'est_verrugas'         => $rec['verrugas']          ?? false,
                'est_pulgas'           => $rec['pulgas_garrapatas'] ?? false,
                'est_secreciones'      => $rec['secreciones']       ?? false,
                'est_lesiones'         => $rec['lesiones']          ?? false,
                'est_alergias'         => $rec['alergias_visibles'] ?? false,
                'est_manto'            => $rec['estado_manto']      ?? null,
                'created_by'           => auth()->id(),
            ]);

            if (!empty($data['proxima_estetica'])) {
                Pet::where('id', $appointment->pet_id)->update(['recordatorio_estetica' => $data['proxima_estetica']]);
            }

            if (!empty($data['checklist_items'])) {
                $tenantId = currentTenantId();
                $event->checklistItems()->sync(
                    collect($data['checklist_items'])
                        ->mapWithKeys(fn($id) => [$id => ['tenant_id' => $tenantId]])
                        ->all()
                );
            }

            $appointment->update(['event_id' => $event->id]);

            // Crear ticket en POS si hay items
            $appointment->load('items');
            if ($appointment->items->isNotEmpty()) {
                $shift = PosShift::where('estado', 'abierto')->first();
                $subtotal = $appointment->items->sum(fn($i) => $i->precio * $i->cantidad);

                $ticket = PosTicket::create([
                    'folio' => $this->nextFolio(),
                    'owner_id' => $appointment->owner_id,
                    'estado' => 'abierto',
                    'shift_open_id' => $shift?->id,
                    'user_open_id' => auth()->id(),
                    'user_last_edit_id' => auth()->id(),
                    'subtotal' => $subtotal,
                    'total' => $subtotal,
                ]);

                foreach ($appointment->items as $item) {
                    PosTicketLine::create([
                        'ticket_id' => $ticket->id,
                        'item_id' => $item->catalog_item_id,
                        'nombre_snapshot' => $item->nombre,
                        'precio_snapshot' => $item->precio,
                        'costo_snapshot' => 0,
                        'cantidad' => $item->cantidad,
                        'subtotal' => $item->precio * $item->cantidad,
                    ]);
                }

                $appointment->update(['pos_ticket_id' => $ticket->id]);
            }
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])
                ->with('success', 'Cita completada. Completa el cobro en POS.')
            : back()->with('success', 'Cita completada y registrada en historial.');
    }

    public function cancel(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se puede cancelar esta cita.');

        DB::transaction(function () use ($appointment) {
            $appointment->update(['estado' => 'cancelada']);
            $this->restoreMembershipCredit($appointment, 'Cita cancelada.');
        });

        return back()->with('success', 'Cita cancelada.');
    }

    public function noShow(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se puede marcar como no presentado.');

        DB::transaction(function () use ($appointment) {
            $appointment->update(['estado' => 'no_show']);
            $this->restoreMembershipCredit($appointment, 'No se presentó.');
        });

        return back()->with('success', 'Cita marcada como no presentado.');
    }

    private function restoreMembershipCredit(Appointment $appointment, string $motivo): void
    {
        if (!$appointment->cobro_membresia || !$appointment->membership_id) {
            return;
        }

        $membership = Membership::with('credits')->find($appointment->membership_id);
        $credit = $membership?->getCredit('estetica');
        if (!$credit) {
            return;
        }

        $saldoAntes = $credit->saldo_actual;
        $credit->update(['saldo_actual' => $saldoAntes + 1]);
        MembershipCreditMovement::create([
            'membership_id'   => $membership->id,
            'credit_id'       => $credit->id,
            'servicio_tipo'   => 'estetica',
            'tipo'            => 'ajuste',
            'cantidad'        => 1,
            'saldo_antes'     => $saldoAntes,
            'saldo_despues'   => $saldoAntes + 1,
            'referencia_tipo' => 'appointment',
            'referencia_id'   => $appointment->id,
            'user_id'         => auth()->id(),
            'notas'           => "Crédito restaurado: {$motivo} (cita #{$appointment->id}).",
        ]);
    }

    public function storeRecepcion(Request $request, Appointment $appointment): RedirectResponse
    {
        $data = $request->validate([
            'verrugas'          => 'boolean',
            'pulgas_garrapatas' => 'boolean',
            'secreciones'       => 'boolean',
            'lesiones'          => 'boolean',
            'alergias_visibles' => 'boolean',
            'nudos_severos'     => 'boolean',
            'estado_manto'      => 'nullable|string|max:50',
            'notas_sesion'      => 'nullable|string|max:2000',
            'accesorios'        => 'nullable|string|max:1000',
        ]);

        $accesorios = $data['accesorios'] ?? null;
        unset($data['accesorios']);

        $appointment->update(['recepcion' => $data, 'accesorios' => $accesorios]);

        return back()->with('success', 'Formulario de recepción guardado.');
    }

    public function storePhoto(Request $request, Appointment $appointment): RedirectResponse
    {
        $request->validate([
            'foto'        => 'required|image|max:20480',
            'descripcion' => 'nullable|string|max:100',
            'tipo'        => 'nullable|in:recepcion,resultado',
        ]);

        $path = $request->file('foto')->store("grooming/{$appointment->id}", media_disk());

        AppointmentPhoto::create([
            'appointment_id' => $appointment->id,
            'ruta'           => $path,
            'tipo'           => $request->input('tipo', 'recepcion'),
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
