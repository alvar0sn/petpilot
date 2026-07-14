<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\HotelRate;
use App\Models\HotelSpace;
use App\Models\HotelStay;
use App\Models\HotelStayPayment;
use App\Models\HotelStayPhoto;
use App\Models\Membership;
use App\Models\MembershipCreditMovement;
use App\Models\PosCatalogItem;
use App\Models\PosCategory;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HotelController extends Controller
{
    public function index(Request $request): Response
    {
        $fechaDisponibilidad = $request->input('fecha_disponibilidad') ?: now()->toDateString();

        $stays = HotelStay::with(['pet.owner:id,nombre,apellidos,telefono', 'space:id,nombre', 'rate:id,nombre'])
            ->when($request->search, fn($q, $s) =>
                $q->whereHas('pet', fn($q) => $q
                    ->where('nombre', 'like', "%$s%")
                    ->orWhereHas('owner', fn($q) => $q
                        ->where('nombre', 'like', "%$s%")
                        ->orWhere('apellidos', 'like', "%$s%")
                        ->orWhere('telefono', 'like', "%$s%")
                    )
                )
            )
            ->when($request->estado, fn($q, $estado) => $q->where('estado', $estado))
            ->when($request->tipo, fn($q, $tipo) => $q->where('tipo', $tipo))
            ->when($request->space_id, fn($q, $spaceId) => $q->where('space_id', $spaceId))
            ->orderByRaw("CASE estado
                WHEN 'activo' THEN 1
                WHEN 'reservado' THEN 2
                WHEN 'completado' THEN 3
                WHEN 'no_presento' THEN 4
                WHEN 'cancelado' THEN 5
                ELSE 6
            END")
            ->orderByRaw("CASE estado WHEN 'activo' THEN fecha_salida WHEN 'reservado' THEN fecha_entrada END ASC")
            ->orderByRaw("CASE WHEN estado IN ('completado', 'no_presento', 'cancelado') THEN fecha_entrada END DESC")
            ->paginate(30)
            ->withQueryString()
            ->through(fn(HotelStay $s) => [
                'id' => $s->id,
                'pet' => $s->pet?->nombre,
                'owner' => $s->pet?->owner?->nombre_completo,
                'tipo' => $s->tipo,
                'estado' => $s->estado,
                'space' => $s->space?->nombre,
                'rate' => $s->rate?->nombre,
                'fecha_entrada' => $s->fecha_entrada,
                'fecha_salida' => $s->fecha_salida,
            ]);

        $spaces = HotelSpace::where('activo', true)
            ->withCount('activeStays')
            ->orderBy('nombre')
            ->get();

        $overdueCheckouts = HotelStay::with(['pet:id,nombre,owner_id', 'pet.owner:id,nombre,apellidos'])
            ->where('estado', 'activo')
            ->whereNotNull('fecha_salida')
            ->whereDate('fecha_salida', '<', now()->toDateString())
            ->orderBy('fecha_salida')
            ->get()
            ->map(fn(HotelStay $s) => [
                'id' => $s->id,
                'pet' => $s->pet?->nombre,
                'owner' => $s->pet?->owner?->nombre_completo,
                'fecha_salida' => $s->fecha_salida,
            ])
            ->values();

        return Inertia::render('Hotel/Index', [
            'stays' => $stays,
            'overdueCheckouts' => $overdueCheckouts,
            'spaces' => $spaces->map(fn(HotelSpace $s) => [
                'id' => $s->id,
                'nombre' => $s->nombre,
                'capacidad' => $s->capacidad,
                'ocupacion' => $s->active_stays_count,
            ]),
            'rates' => HotelRate::where('activa', true)->orderBy('nombre')->get(['id', 'nombre', 'tipo', 'unidad', 'cantidad', 'precio']),
            'availability' => [
                'fecha' => $fechaDisponibilidad,
                'spaces' => $spaces->map(fn(HotelSpace $s) => [
                    'id' => $s->id,
                    'nombre' => $s->nombre,
                    'capacidad' => $s->capacidad,
                    'ocupacion' => $this->spaceOccupancyOnDate($s->id, $fechaDisponibilidad),
                ])->values(),
            ],
            'filters' => $request->only('search', 'estado', 'tipo', 'space_id', 'fecha_disponibilidad'),
        ]);
    }

    private function spaceOccupancyOnDate(int $spaceId, string $fecha): int
    {
        return HotelStay::where('space_id', $spaceId)
            ->whereIn('estado', ['reservado', 'activo'])
            ->whereDate('fecha_entrada', '<=', $fecha)
            ->where(function ($q) use ($fecha) {
                $q->where(fn($q2) => $q2->whereNull('fecha_salida')->whereDate('fecha_entrada', $fecha))
                    ->orWhereDate('fecha_salida', '>=', $fecha);
            })
            ->count();
    }

    private function estimateNights(string $fechaEntrada, ?string $fechaSalida): int
    {
        if (!$fechaSalida) {
            return 1;
        }

        return max(1, \Carbon\Carbon::parse($fechaEntrada)->diffInDays($fechaSalida));
    }

    /**
     * Reserva o libera créditos de membresía para que `creditos_consumidos` quede igual a $nochesObjetivo,
     * sin exceder el saldo disponible. Se usa al crear/editar/cancelar/hacer checkout de una estancia,
     * para que el saldo de la membresía siempre refleje los créditos comprometidos y se eviten sobre-reservas.
     */
    private function reconcileMembershipCredits(HotelStay $stay, int $nochesObjetivo): void
    {
        if (!$stay->cobro_membresia || !$stay->membership_id) {
            return;
        }

        $membership = Membership::with('credits')->find($stay->membership_id);
        $credit = $membership?->getCredit($stay->tipo);

        if (!$credit) {
            return;
        }

        $actuales = $stay->creditos_consumidos ?? 0;
        $deseados = min($nochesObjetivo, $credit->saldo_actual + $actuales);
        $delta = $deseados - $actuales;

        if ($delta === 0) {
            return;
        }

        $saldoAntes = $credit->saldo_actual;
        $saldoNuevo = $saldoAntes - $delta;
        $credit->update(['saldo_actual' => $saldoNuevo]);

        MembershipCreditMovement::create([
            'membership_id' => $membership->id,
            'credit_id' => $credit->id,
            'servicio_tipo' => $credit->servicio_tipo,
            'tipo' => $delta > 0 ? 'consumo' : 'ajuste',
            'cantidad' => -$delta,
            'saldo_antes' => $saldoAntes,
            'saldo_despues' => $saldoNuevo,
            'referencia_tipo' => 'estancia',
            'referencia_id' => $stay->id,
            'user_id' => auth()->id(),
            'notas' => $delta > 0
                ? "Se reservan {$delta} crédito(s) de membresía para esta estancia."
                : 'Se liberan ' . abs($delta) . ' crédito(s) de membresía de esta estancia.',
        ]);

        $stay->update(['creditos_consumidos' => $deseados]);
    }

    private function hasOverlappingStay(int $petId, string $tipo, string $fechaEntrada, ?string $fechaSalida, ?int $excludeStayId = null): bool
    {
        $finNuevo = $fechaSalida ?? $fechaEntrada;

        return HotelStay::where('pet_id', $petId)
            ->where('tipo', $tipo)
            ->whereIn('estado', ['reservado', 'activo'])
            ->when($excludeStayId, fn($q) => $q->where('id', '!=', $excludeStayId))
            ->whereDate('fecha_entrada', '<=', $finNuevo)
            ->where(function ($q) use ($fechaEntrada) {
                $q->where(fn($q2) => $q2->whereNotNull('fecha_salida')->whereDate('fecha_salida', '>=', $fechaEntrada))
                    ->orWhere(fn($q2) => $q2->whereNull('fecha_salida')->whereDate('fecha_entrada', '>=', $fechaEntrada));
            })
            ->exists();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'tipo' => 'required|in:guarderia,hotel',
            'space_id' => 'nullable|exists:hotel_spaces,id',
            'rate_id' => 'nullable|exists:hotel_rates,id',
            'fecha_entrada' => 'required|date',
            'fecha_salida' => 'nullable|date|after_or_equal:fecha_entrada',
            'alimentacion' => 'nullable|string',
            'medicacion' => 'nullable|string',
            'notas' => 'nullable|string',
            'objetos_recibidos' => 'nullable|string',
            'cobro_membresia' => 'boolean',
            'membership_id' => 'nullable|exists:memberships,id',
            'adelanto_rate_id' => 'nullable|exists:hotel_rates,id',
            'adelanto_monto' => 'nullable|numeric|min:0.01',
            'adelanto_notas' => 'nullable|string|max:255',
        ]);

        if ($this->hasOverlappingStay($data['pet_id'], $data['tipo'], $data['fecha_entrada'], $data['fecha_salida'] ?? null)) {
            $tipoLabel = $data['tipo'] === 'hotel' ? 'hotel' : 'guardería';
            return back()->withErrors(['fecha_entrada' => "Esta mascota ya tiene una reserva de {$tipoLabel} que se traslapa con estas fechas."])->withInput();
        }

        if ($request->boolean('cobro_membresia') && !empty($data['membership_id'])) {
            $membresiaValida = Membership::where('id', $data['membership_id'])
                ->where('pet_id', $data['pet_id'])
                ->where('activa', true)
                ->whereDate('fecha_inicio', '<=', $data['fecha_entrada'])
                ->whereDate('fecha_vencimiento', '>=', $data['fecha_entrada'])
                ->exists();

            if (!$membresiaValida) {
                return back()->withErrors(['membership_id' => 'La membresía seleccionada no pertenece a esta mascota o no cubre la fecha de entrada de la reserva.'])->withInput();
            }
        }

        $rate = !empty($data['rate_id']) ? HotelRate::find($data['rate_id']) : null;

        [$stay, $mensaje, $ticket] = DB::transaction(function () use ($request, $data, $rate) {
            $stay = HotelStay::create([
                ...$data,
                'estado' => 'reservado',
                'precio_por_noche' => $rate?->precio,
                'cobro_membresia' => $request->boolean('cobro_membresia'),
                'membership_id' => $request->boolean('cobro_membresia') ? ($data['membership_id'] ?? null) : null,
                'creditos_consumidos' => 0,
                'created_by' => auth()->id(),
            ]);

            $mensaje = 'Reserva creada.';

            if ($stay->cobro_membresia && $stay->membership_id) {
                $noches = $this->estimateNights($data['fecha_entrada'], $data['fecha_salida'] ?? null);
                $this->reconcileMembershipCredits($stay, $noches);

                if ($stay->creditos_consumidos > 0) {
                    $mensaje = $stay->creditos_consumidos < $noches
                        ? "Reserva creada. Se reservaron {$stay->creditos_consumidos} de {$noches} crédito(s) de membresía (créditos insuficientes para cubrir toda la estancia; el resto se cobrará en POS al hacer check-out)."
                        : "Reserva creada. Se reservaron {$stay->creditos_consumidos} crédito(s) de la membresía para esta estancia.";
                }
            }

            $ticket = null;

            if (!empty($data['adelanto_monto'])) {
                $paymentData = [
                    'checkout_rate_id' => $data['adelanto_rate_id'] ?? null,
                    'monto' => $data['adelanto_monto'],
                    'notas' => $data['adelanto_notas'] ?? null,
                ];
                $ticket = $this->createPaymentTicket($stay, $paymentData, 'adelanto');

                HotelStayPayment::create([
                    'stay_id' => $stay->id,
                    'pos_ticket_id' => $ticket->id,
                    'monto' => $data['adelanto_monto'],
                    'tipo' => 'adelanto',
                    'notas' => $data['adelanto_notas'] ?? null,
                    'user_id' => auth()->id(),
                ]);

                $mensaje .= ' Adelanto registrado — completa el cobro en POS.';
            }

            return [$stay, $mensaje, $ticket];
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])->with('success', $mensaje)
            : redirect()->route('hotel.show', $stay)->with('success', $mensaje);
    }

    public function show(HotelStay $stay): Response
    {
        $stay->load([
            'pet.owner:id,nombre,apellidos,telefono',
            'space',
            'rate',
            'membership.plan',
            'membership.credits',
            'ticket',
            'charges',
            'payments.ticket:id,folio',
            'payments.user:id,nombre,apellido',
            'createdBy:id,nombre,apellido',
            'photos' => fn($q) => $q->orderBy('created_at'),
        ]);

        $stay->setRelation('photos', $stay->photos->map(fn(HotelStayPhoto $p) => [
            'id' => $p->id,
            'etiqueta' => $p->etiqueta,
            'url' => Storage::disk(media_disk())->url($p->url),
        ]));

        return Inertia::render('Hotel/Show', [
            'stay' => $stay,
            'spaces' => HotelSpace::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'capacidad']),
            'checkoutRates' => HotelRate::where('activa', true)->where('tipo', $stay->tipo)->orderBy('nombre')->get(['id', 'nombre', 'precio', 'unidad', 'pos_item_id']),
        ]);
    }

    public function update(Request $request, HotelStay $stay): RedirectResponse
    {
        $data = $request->validate([
            'space_id' => 'nullable|exists:hotel_spaces,id',
            'fecha_entrada' => 'required|date',
            'fecha_salida' => 'nullable|date|after_or_equal:fecha_entrada',
            'alimentacion' => 'nullable|string',
            'medicacion' => 'nullable|string',
            'notas' => 'nullable|string',
            'estado_fisico' => 'required|in:ok,lesion',
            'nota_lesion' => 'nullable|string',
            'objetos_recibidos' => 'nullable|string',
        ]);

        if ($this->hasOverlappingStay($stay->pet_id, $stay->tipo, $data['fecha_entrada'], $data['fecha_salida'] ?? null, $stay->id)) {
            $tipoLabel = $stay->tipo === 'hotel' ? 'hotel' : 'guardería';
            return back()->withErrors(['fecha_entrada' => "Esta mascota ya tiene otra reserva de {$tipoLabel} que se traslapa con estas fechas."])->withInput();
        }

        DB::transaction(function () use ($stay, $data) {
            $stay->update($data);

            if ($stay->cobro_membresia && $stay->membership_id && $stay->isActive()) {
                $noches = $this->estimateNights($data['fecha_entrada'], $data['fecha_salida'] ?? null);
                $this->reconcileMembershipCredits($stay, $noches);
            }
        });

        return back()->with('success', 'Estancia actualizada.');
    }

    public function checkin(Request $request, HotelStay $stay): RedirectResponse
    {
        if ($stay->estado !== 'reservado') {
            return back()->with('error', 'Solo se puede hacer check-in a una reserva en estado "reservado".');
        }

        if (!now()->isSameDay($stay->fecha_entrada)) {
            return back()->with('error', 'Solo se puede hacer check-in el día programado de entrada (' . $stay->fecha_entrada->format('d/m/Y') . '). Si la mascota llegó en otra fecha, ajusta primero la fecha de entrada en la ficha.');
        }

        $data = $request->validate([
            'checkout_rate_id' => 'nullable|exists:hotel_rates,id',
            'monto' => 'nullable|numeric|min:0.01',
            'notas' => 'nullable|string|max:255',
        ]);

        $ticket = null;

        DB::transaction(function () use ($stay, $data, &$ticket) {
            $stay->update(['estado' => 'activo']);

            if (!empty($data['monto'])) {
                $ticket = $this->createPaymentTicket($stay, $data, 'adelanto');

                HotelStayPayment::create([
                    'stay_id' => $stay->id,
                    'pos_ticket_id' => $ticket->id,
                    'monto' => $data['monto'],
                    'tipo' => 'adelanto',
                    'notas' => $data['notas'] ?? null,
                    'user_id' => auth()->id(),
                ]);
            }
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])->with('success', 'Check-in realizado. Completa el adelanto en POS.')
            : back()->with('success', 'Check-in realizado.');
    }

    public function storePayment(Request $request, HotelStay $stay): RedirectResponse
    {
        abort_unless(in_array($stay->estado, ['reservado', 'activo']), 422, 'Solo se pueden registrar pagos para reservas activas.');

        $data = $request->validate([
            'checkout_rate_id' => 'nullable|exists:hotel_rates,id',
            'monto' => 'required|numeric|min:0.01',
            'notas' => 'nullable|string|max:255',
        ]);

        $ticket = DB::transaction(function () use ($stay, $data) {
            $ticket = $this->createPaymentTicket($stay, $data, 'abono');

            HotelStayPayment::create([
                'stay_id' => $stay->id,
                'pos_ticket_id' => $ticket->id,
                'monto' => $data['monto'],
                'tipo' => 'abono',
                'notas' => $data['notas'] ?? null,
                'user_id' => auth()->id(),
            ]);

            return $ticket;
        });

        return redirect()->route('pos.index', ['ticket' => $ticket->id])
            ->with('success', 'Abono registrado. Completa el cobro en POS.');
    }

    private function createPaymentTicket(HotelStay $stay, array $data, string $tipo): PosTicket
    {
        $shift = PosShift::where('estado', 'abierto')->first();

        $selectedRate = !empty($data['checkout_rate_id'])
            ? HotelRate::find($data['checkout_rate_id'])
            : $stay->rate;

        $itemId = $selectedRate?->pos_item_id
            ?? $this->ensureHotelRateCatalogItem($stay->tipo === 'hotel' ? 'Hotel' : 'Guardería', $data['monto'])->id;

        $tipoLabel = $tipo === 'adelanto' ? 'Adelanto' : 'Abono';
        $rateName = $selectedRate?->nombre ?? ($stay->tipo === 'hotel' ? 'Hotel' : 'Guardería');
        $nombreSnapshot = "{$tipoLabel} — {$rateName}: {$stay->pet?->nombre}";

        $ticket = PosTicket::create([
            'folio' => $this->nextFolio(),
            'owner_id' => $stay->pet?->owner_id,
            'estado' => 'abierto',
            'shift_open_id' => $shift?->id,
            'user_open_id' => auth()->id(),
            'user_last_edit_id' => auth()->id(),
            'subtotal' => $data['monto'],
            'total' => $data['monto'],
        ]);

        PosTicketLine::create([
            'ticket_id' => $ticket->id,
            'item_id' => $itemId,
            'nombre_snapshot' => $nombreSnapshot,
            'precio_snapshot' => $data['monto'],
            'costo_snapshot' => 0,
            'cantidad' => 1,
            'subtotal' => $data['monto'],
        ]);

        return $ticket;
    }

    public function checkout(Request $request, HotelStay $stay): RedirectResponse
    {
        if ($stay->estado !== 'activo') {
            return back()->with('error', 'Solo se puede hacer check-out a una estancia en estado "activo".');
        }

        $data = $request->validate([
            'checkout_rate_id' => 'nullable|exists:hotel_rates,id',
            'monto' => 'required|numeric|min:0',
            'fecha_salida' => 'required|date',
        ]);

        [$ticket, $mensaje] = DB::transaction(function () use ($stay, $data) {
            $noches = max(1, \Carbon\Carbon::parse($stay->fecha_entrada)->diffInDays($data['fecha_salida']));

            if ($stay->cobro_membresia && $stay->membership_id) {
                $this->reconcileMembershipCredits($stay, $noches);
                $stay->refresh();
            }

            $creditosAUsar = $stay->cobro_membresia ? ($stay->creditos_consumidos ?? 0) : 0;
            $nochesExtra = $noches - $creditosAUsar;

            $totalPagado = $stay->payments()->sum('monto');
            $saldoPendiente = max(0, $data['monto'] - $totalPagado);

            $ticket = null;

            if ($nochesExtra > 0 && $saldoPendiente > 0) {
                $shift = PosShift::where('estado', 'abierto')->first();

                $selectedRate = !empty($data['checkout_rate_id'])
                    ? HotelRate::find($data['checkout_rate_id'])
                    : $stay->rate;

                $itemId = $selectedRate?->pos_item_id
                    ?? $this->ensureHotelRateCatalogItem($stay->tipo === 'hotel' ? 'Hotel' : 'Guardería', $selectedRate?->precio ?? $data['monto'])->id;

                $tipoLabel = $stay->tipo === 'hotel' ? 'Hotel' : 'Guardería';
                $rateName = $selectedRate?->nombre ?? $tipoLabel;
                $precioUnitario = $selectedRate?->precio ?? ($nochesExtra > 0 ? round($data['monto'] / $nochesExtra, 2) : $data['monto']);
                $unidadLabel = $selectedRate?->unidad === 'horas' ? 'hora(s)' : 'noche(s)';

                $nombreSnapshot = $creditosAUsar > 0
                    ? "{$rateName} — {$stay->pet?->nombre} ({$nochesExtra} {$unidadLabel} sin cobertura)"
                    : "{$rateName} — {$stay->pet?->nombre} ({$nochesExtra} {$unidadLabel})";

                $ticket = PosTicket::create([
                    'folio' => $this->nextFolio(),
                    'owner_id' => $stay->pet?->owner_id,
                    'estado' => 'abierto',
                    'shift_open_id' => $shift?->id,
                    'user_open_id' => auth()->id(),
                    'user_last_edit_id' => auth()->id(),
                    'subtotal' => $saldoPendiente,
                    'total' => $saldoPendiente,
                ]);

                PosTicketLine::create([
                    'ticket_id' => $ticket->id,
                    'item_id' => $itemId,
                    'nombre_snapshot' => $nombreSnapshot,
                    'precio_snapshot' => $precioUnitario,
                    'costo_snapshot' => 0,
                    'cantidad' => $nochesExtra,
                    'subtotal' => $saldoPendiente,
                ]);
            }

            $stay->update([
                'estado' => 'completado',
                'fecha_salida' => $data['fecha_salida'],
                'pos_ticket_id' => $ticket?->id,
            ]);

            $mensaje = match (true) {
                $ticket && $creditosAUsar > 0 => "Check-out realizado. La membresía cubrió {$creditosAUsar} noche(s) (reservadas desde la creación) y se generó el ticket #{$ticket->folio} en POS por las {$nochesExtra} noche(s) restantes — complétalo ahí para cobrar.",
                (bool) $ticket => "Check-out realizado. Se generó el ticket #{$ticket->folio} en POS — complétalo ahí para cobrar.",
                $creditosAUsar > 0 => "Check-out realizado. La membresía cubrió las {$creditosAUsar} noche(s) de la estancia (créditos ya reservados desde la creación).",
                default => 'Check-out realizado.',
            };

            return [$ticket, $mensaje];
        });

        return $ticket
            ? redirect()->route('pos.index', ['ticket' => $ticket->id])->with('success', $mensaje)
            : redirect()->route('hotel.show', $stay)->with('success', $mensaje);
    }

    public function cancel(Request $request, HotelStay $stay): RedirectResponse
    {
        $data = $request->validate([
            'motivo_cancelacion' => 'required|string|max:255',
        ]);

        DB::transaction(function () use ($stay, $data) {
            // Libera de vuelta a la membresía cualquier crédito que se hubiera reservado para esta estancia
            $this->reconcileMembershipCredits($stay, 0);

            $stay->update([
                'estado' => 'cancelado',
                'motivo_cancelacion' => $data['motivo_cancelacion'],
            ]);
        });

        return back()->with('success', 'Reserva cancelada.');
    }

    public function storePhoto(Request $request, HotelStay $stay): RedirectResponse
    {
        if ($stay->photos()->count() >= 3) {
            return back()->with('error', 'Ya se alcanzó el máximo de 3 fotos por estancia.');
        }

        $data = $request->validate([
            'foto' => 'required|image|max:5120',
            'etiqueta' => 'nullable|string|max:100',
        ]);

        $path = $request->file('foto')->store("hotel-stays/{$stay->id}", media_disk());

        HotelStayPhoto::create([
            'stay_id' => $stay->id,
            'etiqueta' => $data['etiqueta'] ?? null,
            'url' => $path,
        ]);

        return back()->with('success', 'Foto agregada.');
    }

    public function destroyPhoto(HotelStay $stay, HotelStayPhoto $photo): RedirectResponse
    {
        Storage::disk(media_disk())->delete($photo->url);
        $photo->delete();

        return back()->with('success', 'Foto eliminada.');
    }

    // Configuración: espacios y tarifas
    public function config(): Response
    {
        return Inertia::render('Hotel/Config', [
            'spaces' => HotelSpace::orderBy('nombre')->get(),
            'rates' => HotelRate::orderBy('nombre')->get(),
        ]);
    }

    public function storeSpace(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'capacidad' => 'nullable|integer|min:1',
        ]);

        HotelSpace::create([...$data, 'capacidad' => $data['capacidad'] ?? null, 'activo' => true]);

        return back()->with('success', 'Espacio creado.');
    }

    public function updateSpace(Request $request, HotelSpace $space): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'capacidad' => 'nullable|integer|min:1',
            'activo' => 'boolean',
        ]);

        $data['capacidad'] = $data['capacidad'] ?? null;

        $space->update($data);

        return back()->with('success', 'Espacio actualizado.');
    }

    public function destroySpace(HotelSpace $space): RedirectResponse
    {
        $space->delete();

        return back()->with('success', 'Espacio eliminado.');
    }

    public function storeRate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:guarderia,hotel',
            'unidad' => 'required|in:horas,dias',
            'cantidad' => 'required|numeric|min:0.01',
            'precio' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $posItemId = $this->ensureHotelRateCatalogItem($data['nombre'], $data['precio'])->id;

            HotelRate::create([
                ...$data,
                'pos_item_id' => $posItemId,
                'activa' => true,
            ]);
        });

        return back()->with('success', 'Tarifa creada.');
    }

    public function updateRate(Request $request, HotelRate $rate): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:guarderia,hotel',
            'unidad' => 'required|in:horas,dias',
            'cantidad' => 'required|numeric|min:0.01',
            'precio' => 'required|numeric|min:0',
            'activa' => 'boolean',
        ]);

        $rate->update($data);

        return back()->with('success', 'Tarifa actualizada.');
    }

    public function destroyRate(HotelRate $rate): RedirectResponse
    {
        $rate->delete();

        return back()->with('success', 'Tarifa eliminada.');
    }

    private function ensureHotelRateCatalogItem(string $nombre, float $precio): PosCatalogItem
    {
        $categoria = PosCategory::firstOrCreate(
            ['nombre' => 'Hotel y Guardería'],
            ['orden' => (int) PosCategory::max('orden') + 1, 'activo' => true]
        );

        return PosCatalogItem::create([
            'categoria_id' => $categoria->id,
            'nombre' => $nombre,
            'tipo' => 'servicio',
            'precio' => $precio,
            'activo' => true,
        ]);
    }

    private function nextFolio(): int
    {
        $config = \App\Models\PosConfig::where('clave', 'folio_siguiente')->first();
        $folio = $config ? (int) $config->valor : 1;
        $config ? $config->update(['valor' => $folio + 1]) : \App\Models\PosConfig::create(['clave' => 'folio_siguiente', 'valor' => $folio + 1]);
        return $folio;
    }
}
