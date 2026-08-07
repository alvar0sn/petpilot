<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentItem;
use App\Models\Event;
use App\Models\EventType;
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
use Inertia\Inertia;
use Inertia\Response;

class TrainingController extends Controller
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
            'items',
        ])
            ->where('modulo', 'entrenamiento')
            ->whereBetween('fecha', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn(Appointment $a) => [
                'id'             => $a->id,
                'fecha'          => $a->fecha->toDateString(),
                'hora_inicio'    => $a->hora_inicio,
                'hora_fin'       => $a->hora_fin,
                'estado'         => $a->estado,
                'pet'            => $a->pet?->nombre,
                'owner'          => $a->pet?->owner?->nombre_completo,
                'entrenador'     => $a->groomer ? trim($a->groomer->nombre . ' ' . $a->groomer->apellido) : null,
                'notas_internas' => $a->notas_internas,
            ]);

        return Inertia::render('Training/Index', [
            'appointments' => $appointments,
            'weekStart'    => $weekStart->toDateString(),
            'entrenadores' => User::where('tenant_id', $tenant->id)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'apellido']),
            'catalogItems' => PosCatalogItem::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'precio']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id'          => 'required|exists:pets,id',
            'fecha'           => 'required|date',
            'hora_inicio'     => 'required|date_format:H:i,H:i:s',
            'hora_fin'        => 'nullable|date_format:H:i,H:i:s|after:hora_inicio',
            'entrenador_id'   => 'nullable|exists:users,id',
            'notas_internas'  => 'nullable|string|max:1000',
            'cobro_membresia' => 'boolean',
            'membership_id'   => 'nullable|exists:memberships,id',
            'items'               => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre'   => 'required|string|max:255',
            'items.*.precio'   => 'required|numeric|min:0',
            'items.*.cantidad' => 'nullable|numeric|min:0.01',
        ]);

        $pet = Pet::findOrFail($data['pet_id']);
        $entrenamientoType = EventType::where('nombre', 'Entrenamiento')->first();
        $usaMembresia = !empty($data['cobro_membresia']) && !empty($data['membership_id']);

        $mensaje = "Clase agendada para {$pet->nombre}.";

        DB::transaction(function () use ($data, $pet, $entrenamientoType, $usaMembresia, &$mensaje) {
            $appointment = Appointment::create([
                'pet_id'           => $pet->id,
                'owner_id'         => $pet->owner_id,
                'tipo_servicio_id' => $entrenamientoType?->id,
                'fecha'            => $data['fecha'],
                'hora_inicio'      => $data['hora_inicio'],
                'hora_fin'         => $data['hora_fin'] ?? null,
                'estado'           => 'pendiente',
                'modulo'           => 'entrenamiento',
                'groomer_id'       => $data['entrenador_id'] ?? null,
                'notas_internas'   => $data['notas_internas'] ?? null,
                'cobro_membresia'  => $usaMembresia,
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
                $credit = $membership->getCredit('entrenamiento');
                if ($credit && $credit->saldo_actual > 0) {
                    $saldoAntes = $credit->saldo_actual;
                    $credit->update(['saldo_actual' => $saldoAntes - 1]);
                    MembershipCreditMovement::create([
                        'membership_id'   => $membership->id,
                        'credit_id'       => $credit->id,
                        'servicio_tipo'   => 'entrenamiento',
                        'tipo'            => 'consumo',
                        'cantidad'        => -1,
                        'saldo_antes'     => $saldoAntes,
                        'saldo_despues'   => $saldoAntes - 1,
                        'referencia_tipo' => 'appointment',
                        'referencia_id'   => $appointment->id,
                        'user_id'         => auth()->id(),
                        'notas'           => "Clase de entrenamiento #{$appointment->id} agendada.",
                    ]);
                    $mensaje = "Clase agendada para {$pet->nombre}. Se descontó 1 crédito de entrenamiento (saldo: " . ($saldoAntes - 1) . ").";
                }
            }
        });

        return redirect()->route('training.index', ['week_start' => $data['fecha']])
            ->with('success', $mensaje);
    }

    public function show(Appointment $appointment): Response
    {
        $tenant = app('current_tenant');

        $appointment->load([
            'pet:id,nombre,owner_id,raza,sexo,tamanio,peso,fecha_nacimiento,nivel_agresividad,obs_comportamiento',
            'pet.owner:id,nombre,apellidos,telefono',
            'groomer:id,nombre,apellido',
            'items.catalogItem:id,nombre',
            'ticket:id,folio,estado',
            'membership.credits',
            'event:id,notas',
        ]);

        return Inertia::render('Training/Show', [
            'appointment' => [
                'id'             => $appointment->id,
                'fecha'          => $appointment->fecha->toDateString(),
                'hora_inicio'    => $appointment->hora_inicio ? substr($appointment->hora_inicio, 0, 5) : null,
                'hora_fin'       => $appointment->hora_fin    ? substr($appointment->hora_fin, 0, 5)    : null,
                'estado'         => $appointment->estado,
                'notas_internas' => $appointment->notas_internas,
                'created_via'    => $appointment->created_via,
                'pet' => $appointment->pet ? [
                    'id'                 => $appointment->pet->id,
                    'nombre'             => $appointment->pet->nombre,
                    'raza'               => $appointment->pet->raza,
                    'sexo'               => $appointment->pet->sexo,
                    'tamanio'            => $appointment->pet->tamanio,
                    'peso'               => $appointment->pet->peso,
                    'fecha_nacimiento'   => $appointment->pet->fecha_nacimiento?->toDateString(),
                    'nivel_agresividad'  => $appointment->pet->nivel_agresividad,
                    'obs_comportamiento' => $appointment->pet->obs_comportamiento,
                ] : null,
                'owner' => $appointment->pet?->owner ? [
                    'id'       => $appointment->pet->owner->id,
                    'nombre'   => $appointment->pet->owner->nombre_completo,
                    'telefono' => $appointment->pet->owner->telefono,
                ] : null,
                'entrenador' => $appointment->groomer ? ['id' => $appointment->groomer->id, 'nombre' => trim($appointment->groomer->nombre . ' ' . $appointment->groomer->apellido)] : null,
                'items' => $appointment->items->map(fn($i) => [
                    'id'              => $i->id,
                    'nombre'          => $i->nombre,
                    'precio'          => $i->precio,
                    'cantidad'        => $i->cantidad,
                    'catalog_item_id' => $i->catalog_item_id,
                ]),
                'ticket_folio'              => $appointment->ticket?->folio,
                'ticket_id'                 => $appointment->pos_ticket_id,
                'notas_resultado'           => $appointment->event?->notas,
                'cobro_membresia'           => $appointment->cobro_membresia,
                'membership_id'             => $appointment->membership_id,
                'creditos_entrenamiento_saldo' => $appointment->membership?->getCredit('entrenamiento')?->saldo_actual,
            ],
            'entrenadores' => User::where('tenant_id', $tenant->id)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'apellido']),
            'catalogItems' => PosCatalogItem::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'precio']),
        ]);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'Solo se pueden editar clases pendientes o confirmadas.');

        $data = $request->validate([
            'fecha'          => 'required|date',
            'hora_inicio'    => 'required|date_format:H:i,H:i:s',
            'hora_fin'       => 'nullable|date_format:H:i,H:i:s|after:hora_inicio',
            'entrenador_id'  => 'nullable|exists:users,id',
            'notas_internas' => 'nullable|string|max:1000',
            'items'               => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre'   => 'required|string|max:255',
            'items.*.precio'   => 'required|numeric|min:0',
            'items.*.cantidad' => 'nullable|numeric|min:0.01',
        ]);

        $appointment->update([
            'fecha'          => $data['fecha'],
            'hora_inicio'    => $data['hora_inicio'],
            'hora_fin'       => $data['hora_fin'] ?? null,
            'groomer_id'     => $data['entrenador_id'] ?? null,
            'notas_internas' => $data['notas_internas'] ?? null,
        ]);

        return back()->with('success', 'Clase actualizada.');
    }

    public function updateItems(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se pueden editar los cargos de esta clase.');

        $data = $request->validate([
            'items'                   => 'nullable|array',
            'items.*.catalog_item_id' => 'nullable|exists:pos_catalog_items,id',
            'items.*.nombre'          => 'required|string|max:255',
            'items.*.precio'          => 'required|numeric|min:0',
            'items.*.cantidad'        => 'nullable|numeric|min:0.01',
        ]);

        DB::transaction(function () use ($appointment, $data) {
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

        return back()->with('success', 'Cargos actualizados.');
    }

    public function confirm(Appointment $appointment): RedirectResponse
    {
        abort_unless($appointment->estado === 'pendiente', 422, 'Solo se pueden confirmar clases pendientes.');

        $appointment->update(['estado' => 'confirmada']);

        return back()->with('success', 'Clase confirmada.');
    }

    public function complete(Request $request, Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'Solo se pueden completar clases pendientes o confirmadas.');

        $data = $request->validate([
            'notas_resultado' => 'nullable|string|max:2000',
        ]);

        $ticket = null;

        DB::transaction(function () use ($appointment, $data, &$ticket) {
            $appointment->update(['estado' => 'completada']);

            $event = Event::create([
                'pet_id'         => $appointment->pet_id,
                'event_type_id'  => $appointment->tipo_servicio_id,
                'fecha'          => $appointment->fecha,
                'notas'          => $data['notas_resultado'] ?? null,
                'appointment_id' => $appointment->id,
                'created_by'     => auth()->id(),
            ]);

            $appointment->update(['event_id' => $event->id]);

            // Crear ticket en POS si hay items (venta directa, sin membresía)
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
                ->with('success', 'Clase completada. Completa el cobro en POS.')
            : back()->with('success', 'Clase completada y registrada en historial.');
    }

    public function cancel(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se puede cancelar esta clase.');

        DB::transaction(function () use ($appointment) {
            $appointment->update(['estado' => 'cancelada']);
            $this->restoreMembershipCredit($appointment, 'Clase cancelada.');
        });

        return back()->with('success', 'Clase cancelada.');
    }

    public function noShow(Appointment $appointment): RedirectResponse
    {
        abort_unless(in_array($appointment->estado, ['pendiente', 'confirmada']), 422, 'No se puede marcar como no presentado.');

        DB::transaction(function () use ($appointment) {
            $appointment->update(['estado' => 'no_show']);
            $this->restoreMembershipCredit($appointment, 'No se presentó.');
        });

        return back()->with('success', 'Clase marcada como no presentado.');
    }

    private function restoreMembershipCredit(Appointment $appointment, string $motivo): void
    {
        if (!$appointment->cobro_membresia || !$appointment->membership_id) {
            return;
        }

        $membership = Membership::with('credits')->find($appointment->membership_id);
        $credit = $membership?->getCredit('entrenamiento');
        if (!$credit) {
            return;
        }

        $saldoAntes = $credit->saldo_actual;
        $credit->update(['saldo_actual' => $saldoAntes + 1]);
        MembershipCreditMovement::create([
            'membership_id'   => $membership->id,
            'credit_id'       => $credit->id,
            'servicio_tipo'   => 'entrenamiento',
            'tipo'            => 'ajuste',
            'cantidad'        => 1,
            'saldo_antes'     => $saldoAntes,
            'saldo_despues'   => $saldoAntes + 1,
            'referencia_tipo' => 'appointment',
            'referencia_id'   => $appointment->id,
            'user_id'         => auth()->id(),
            'notas'           => "Crédito restaurado: {$motivo} (clase #{$appointment->id}).",
        ]);
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
