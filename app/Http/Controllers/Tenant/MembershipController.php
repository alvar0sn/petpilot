<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\MembershipCredit;
use App\Models\MembershipCreditMovement;
use App\Models\MembershipPlan;
use App\Models\MembershipPlanCredit;
use App\Models\Pet;
use App\Models\PosCatalogItem;
use App\Models\PosCategory;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MembershipController extends Controller
{
    public function index(Request $request): Response
    {
        $memberships = Membership::with(['pet.owner:id,nombre,apellidos,telefono', 'plan:id,nombre,precio', 'credits'])
            ->where('activa', true)
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
            ->when($request->plan_id, fn($q, $planId) => $q->where('plan_id', $planId))
            ->when($request->boolean('vence_pronto'), fn($q) =>
                $q->whereDate('fecha_vencimiento', '<=', now()->addDays(7))
            )
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn($m) => [
                'id' => $m->id,
                'pet' => $m->pet?->nombre,
                'owner' => $m->pet?->owner?->nombre_completo,
                'plan' => $m->plan?->nombre,
                'fecha_inicio' => $m->fecha_inicio,
                'fecha_vencimiento' => $m->fecha_vencimiento,
                'dias_para_vencer' => $m->diasParaVencer(),
                'congelada' => $m->congelada,
                'credits' => $m->credits->map(fn($c) => [
                    'servicio_tipo' => $c->servicio_tipo,
                    'saldo_actual' => $c->saldo_actual,
                    'saldo_inicial' => $c->saldo_inicial,
                ]),
                'activa' => $m->activa,
            ]);

        $plans = MembershipPlan::where('activo', true)->with('planCredits')->get(['id', 'nombre', 'precio', 'vigencia_dias']);

        return Inertia::render('Memberships/Index', [
            'memberships' => $memberships,
            'plans' => $plans,
            'filters' => $request->only('search', 'plan_id', 'vence_pronto'),
        ]);
    }

    public function assign(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'plan_id' => 'required|exists:membership_plans,id',
            'fecha_inicio' => 'required|date',
        ]);

        $plan = MembershipPlan::with('planCredits')->findOrFail($data['plan_id']);
        $pet = Pet::with('owner:id,nombre')->findOrFail($data['pet_id']);

        $ticket = null;

        DB::transaction(function () use ($plan, $pet, $data, &$ticket) {
            $fechaInicio = \Carbon\Carbon::parse($data['fecha_inicio']);
            $fechaVencimiento = $fechaInicio->clone()->addDays($plan->vigencia_dias);

            // Crear ticket en POS si el plan tiene un pos_item
            $shift = PosShift::where('estado', 'abierto')->first();

            if ($plan->pos_item_id) {
                $ticket = PosTicket::create([
                    'folio' => $this->nextFolio(),
                    'owner_id' => $pet->owner_id,
                    'estado' => 'abierto',
                    'shift_open_id' => $shift?->id,
                    'user_open_id' => auth()->id(),
                    'user_last_edit_id' => auth()->id(),
                    'subtotal' => $plan->precio,
                    'total' => $plan->precio,
                ]);
                PosTicketLine::create([
                    'ticket_id' => $ticket->id,
                    'item_id' => $plan->pos_item_id,
                    'nombre_snapshot' => "Membresía: {$plan->nombre}",
                    'precio_snapshot' => $plan->precio,
                    'costo_snapshot' => 0,
                    'cantidad' => 1,
                    'subtotal' => $plan->precio,
                ]);
            }

            $membership = Membership::create([
                'pet_id' => $pet->id,
                'plan_id' => $plan->id,
                'fecha_inicio' => $fechaInicio,
                'fecha_vencimiento' => $fechaVencimiento,
                'activa' => true,
                'pos_ticket_id' => $ticket?->id,
            ]);

            $proximoReinicio = match ($plan->reinicio_creditos) {
                'semanal' => $fechaInicio->clone()->addWeek(),
                'mensual' => $fechaInicio->clone()->addMonth(),
                default => null,
            };

            foreach ($plan->planCredits as $pc) {
                MembershipCredit::create([
                    'membership_id' => $membership->id,
                    'servicio_tipo' => $pc->servicio_tipo,
                    'saldo_inicial' => $pc->creditos,
                    'saldo_actual' => $pc->creditos,
                    'proximo_reinicio' => $proximoReinicio,
                ]);
            }
        });

        if ($ticket) {
            return redirect()->route('pos.index', ['ticket' => $ticket->id])
                ->with('success', "Membresía asignada a {$pet->nombre}. Completa el cobro en el POS.");
        }

        return back()->with('success', "Membresía asignada a {$pet->nombre}.");
    }

    public function show(Membership $membership): Response
    {
        $membership->load([
            'pet.owner:id,nombre,apellidos,telefono',
            'plan.planCredits',
            'credits',
            'creditMovements' => fn($q) => $q->latest()->limit(50),
        ]);

        return Inertia::render('Memberships/Show', [
            'membership' => $membership,
        ]);
    }

    public function adjust(Request $request, Membership $membership): RedirectResponse
    {
        $data = $request->validate([
            'credit_id' => 'required|exists:membership_credits,id',
            'cantidad' => 'required|integer|not_in:0',
            'notas' => 'nullable|string|max:200',
        ]);

        $credit = MembershipCredit::findOrFail($data['credit_id']);
        $saldoAntes = $credit->saldo_actual;
        $saldoNuevo = max(0, $saldoAntes + $data['cantidad']);

        DB::transaction(function () use ($credit, $membership, $data, $saldoAntes, $saldoNuevo) {
            $credit->update(['saldo_actual' => $saldoNuevo]);

            MembershipCreditMovement::create([
                'membership_id' => $membership->id,
                'credit_id' => $credit->id,
                'servicio_tipo' => $credit->servicio_tipo,
                'tipo' => 'ajuste',
                'cantidad' => $data['cantidad'],
                'saldo_antes' => $saldoAntes,
                'saldo_despues' => $saldoNuevo,
                'referencia_tipo' => 'manual',
                'user_id' => auth()->id(),
                'notas' => $data['notas'],
            ]);
        });

        return back()->with('success', 'Créditos ajustados.');
    }

    public function deactivate(Membership $membership): RedirectResponse
    {
        $membership->update(['activa' => false]);
        return back()->with('success', 'Membresía desactivada.');
    }

    public function update(Request $request, Membership $membership): RedirectResponse
    {
        $data = $request->validate([
            'fecha_inicio' => 'required|date',
            'fecha_vencimiento' => 'required|date|after_or_equal:fecha_inicio',
        ]);

        $membership->update($data);

        return back()->with('success', 'Membresía actualizada.');
    }

    public function freeze(Membership $membership): RedirectResponse
    {
        if ($membership->congelada) {
            return back()->with('error', 'Esta membresía ya está congelada.');
        }

        $membership->update([
            'congelada' => true,
            'congelada_desde' => now()->toDateString(),
        ]);

        return back()->with('success', 'Membresía congelada. Al descongelarla, la vigencia se extenderá por los días que estuvo congelada.');
    }

    public function unfreeze(Membership $membership): RedirectResponse
    {
        if (!$membership->congelada) {
            return back()->with('error', 'Esta membresía no está congelada.');
        }

        $diasCongelada = (int) \Carbon\Carbon::parse($membership->congelada_desde)->startOfDay()->diffInDays(now()->startOfDay());

        $membership->update([
            'congelada' => false,
            'congelada_desde' => null,
            'fecha_vencimiento' => $membership->fecha_vencimiento->clone()->addDays($diasCongelada),
        ]);

        return back()->with('success', "Membresía descongelada. Vigencia extendida {$diasCongelada} día(s) por el periodo que estuvo congelada.");
    }

    // Para los planes (settings de membresías)
    public function plans(): Response
    {
        $plans = MembershipPlan::with('planCredits')->orderBy('nombre')->get();

        return Inertia::render('Memberships/Plans', [
            'plans' => $plans,
        ]);
    }

    public function storePlan(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'precio' => 'required|numeric|min:0',
            'vigencia_dias' => 'required|integer|min:1',
            'reinicio_creditos' => 'required|in:ninguno,semanal,mensual',
            'pos_item_id' => 'nullable|exists:pos_catalog_items,id',
            'credits' => 'required|array|min:1',
            'credits.*.servicio_tipo' => 'required|in:guarderia,hotel,estetica,paseo',
            'credits.*.creditos' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($data) {
            $posItemId = ($data['pos_item_id'] ?? null) ?: $this->ensureMembershipCatalogItem($data['nombre'], $data['precio'])->id;

            $plan = MembershipPlan::create([
                'nombre' => $data['nombre'],
                'precio' => $data['precio'],
                'vigencia_dias' => $data['vigencia_dias'],
                'reinicio_creditos' => $data['reinicio_creditos'],
                'pos_item_id' => $posItemId,
                'activo' => true,
            ]);

            foreach ($data['credits'] as $credit) {
                MembershipPlanCredit::create([
                    'plan_id' => $plan->id,
                    'servicio_tipo' => $credit['servicio_tipo'],
                    'creditos' => $credit['creditos'],
                ]);
            }
        });

        return back()->with('success', 'Plan creado.');
    }

    public function updatePlan(Request $request, MembershipPlan $plan): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'precio' => 'required|numeric|min:0',
            'vigencia_dias' => 'required|integer|min:1',
            'reinicio_creditos' => 'required|in:ninguno,semanal,mensual',
            'pos_item_id' => 'nullable|exists:pos_catalog_items,id',
            'activo' => 'boolean',
        ]);

        $plan->update($data);
        return back()->with('success', 'Plan actualizado.');
    }

    private function ensureMembershipCatalogItem(string $nombre, float $precio): PosCatalogItem
    {
        $categoria = PosCategory::firstOrCreate(
            ['nombre' => 'Membresías'],
            ['orden' => (int) PosCategory::max('orden') + 1, 'activo' => true]
        );

        return PosCatalogItem::create([
            'categoria_id' => $categoria->id,
            'nombre' => "Membresía: {$nombre}",
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
