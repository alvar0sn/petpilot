<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PackageCredit;
use App\Models\PackageItem;
use App\Models\Pet;
use App\Models\PosCatalogItem;
use App\Models\PosConfig;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    public function index(Request $request): Response
    {
        $packages = Package::with(['pet:id,nombre,owner_id', 'pet.owner:id,nombre,apellidos', 'credits'])
            ->when($request->search, function ($q, $s) {
                $sl = '%' . mb_strtolower($s) . '%';
                $q->whereHas('pet', fn($q) => $q
                    ->whereRaw('LOWER(nombre) LIKE ?', [$sl])
                    ->orWhereHas('owner', fn($q) => $q
                        ->whereRaw('LOWER(nombre) LIKE ?', [$sl])
                        ->orWhereRaw('LOWER(apellidos) LIKE ?', [$sl])
                    )
                );
            })
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn(Package $p) => [
                'id' => $p->id,
                'pet' => $p->pet?->nombre,
                'owner' => $p->pet?->owner?->nombre_completo,
                'total' => $p->total,
                'fecha_vencimiento' => $p->fecha_vencimiento->toDateString(),
                'vencido' => $p->isExpired(),
                'creditos_restantes' => $p->credits->sum('saldo_actual'),
                'creditos_totales' => $p->credits->sum('saldo_inicial'),
            ]);

        return Inertia::render('Packages/Index', [
            'packages' => $packages,
            'filters' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Packages/Create', [
            'catalogItems' => PosCatalogItem::where('activo', true)
                ->with('categoria:id,nombre')
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'precio', 'categoria_id'])
                ->map(fn($item) => [
                    'id' => $item->id,
                    'nombre' => $item->nombre,
                    'precio' => $item->precio,
                    'categoria' => $item->categoria?->nombre,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'vigencia_dias' => 'required|integer|min:1|max:365',
            'descuento_tipo' => 'nullable|in:monto,porcentaje',
            'descuento_valor' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.pos_catalog_item_id' => 'required|exists:pos_catalog_items,id',
            'items.*.nombre' => 'required|string|max:255',
            'items.*.precio' => 'required|numeric|min:0',
            'items.*.cantidad' => 'required|numeric|min:0.01',
        ]);

        $pet = Pet::findOrFail($data['pet_id']);

        $subtotal = collect($data['items'])->sum(fn($i) => $i['precio'] * $i['cantidad']);

        $descuentoTipo = $data['descuento_tipo'] ?? null;
        $descuentoValor = (float) ($data['descuento_valor'] ?? 0);
        $descuentoMonto = match ($descuentoTipo) {
            'monto' => $descuentoValor,
            'porcentaje' => $subtotal * $descuentoValor / 100,
            default => 0,
        };
        $total = max(0, round($subtotal - $descuentoMonto, 2));
        $fechaVencimiento = now()->addDays((int) $data['vigencia_dias'])->toDateString();

        $package = DB::transaction(function () use ($data, $pet, $subtotal, $descuentoTipo, $descuentoValor, $total, $fechaVencimiento) {
            $shift = PosShift::where('estado', 'abierto')->first();

            $ticket = PosTicket::create([
                'folio' => $this->nextFolio(),
                'owner_id' => $pet->owner_id,
                'estado' => 'abierto',
                'shift_open_id' => $shift?->id,
                'user_open_id' => auth()->id(),
                'user_last_edit_id' => auth()->id(),
                'subtotal' => $subtotal,
                'discount_amount' => round($subtotal - $total, 2),
                'total' => $total,
            ]);

            $package = Package::create([
                'pet_id' => $pet->id,
                'owner_id' => $pet->owner_id,
                'subtotal' => $subtotal,
                'descuento_tipo' => $descuentoTipo,
                'descuento_valor' => $descuentoValor,
                'total' => $total,
                'fecha_vencimiento' => $fechaVencimiento,
                'pos_ticket_id' => $ticket->id,
                'created_by' => auth()->id(),
            ]);

            $creditosPorArticulo = [];

            foreach ($data['items'] as $item) {
                $itemSubtotal = $item['precio'] * $item['cantidad'];

                PackageItem::create([
                    'package_id' => $package->id,
                    'pos_catalog_item_id' => $item['pos_catalog_item_id'],
                    'nombre_snapshot' => $item['nombre'],
                    'precio_snapshot' => $item['precio'],
                    'cantidad' => $item['cantidad'],
                    'subtotal' => $itemSubtotal,
                ]);

                PosTicketLine::create([
                    'ticket_id' => $ticket->id,
                    'item_id' => $item['pos_catalog_item_id'],
                    'nombre_snapshot' => $item['nombre'],
                    'precio_snapshot' => $item['precio'],
                    'costo_snapshot' => 0,
                    'cantidad' => $item['cantidad'],
                    'subtotal' => $itemSubtotal,
                ]);

                $key = $item['pos_catalog_item_id'];
                $creditosPorArticulo[$key] = ($creditosPorArticulo[$key] ?? 0) + $item['cantidad'];
            }

            foreach ($creditosPorArticulo as $catalogItemId => $cantidad) {
                $nombre = collect($data['items'])->firstWhere('pos_catalog_item_id', $catalogItemId)['nombre'];

                PackageCredit::create([
                    'package_id' => $package->id,
                    'pet_id' => $pet->id,
                    'pos_catalog_item_id' => $catalogItemId,
                    'nombre_snapshot' => $nombre,
                    'saldo_inicial' => $cantidad,
                    'saldo_actual' => $cantidad,
                    'fecha_vencimiento' => $fechaVencimiento,
                ]);
            }

            return $package;
        });

        return redirect()->route('pos.index', ['ticket' => $package->pos_ticket_id])
            ->with('success', 'Paquete creado. Completa el cobro en POS.');
    }

    public function show(Package $package): Response
    {
        $package->load([
            'pet:id,nombre,owner_id',
            'pet.owner:id,nombre,apellidos,telefono',
            'ticket:id,folio,estado',
            'items.catalogItem:id,nombre',
            'credits.movements' => fn($q) => $q->latest('created_at'),
        ]);

        return Inertia::render('Packages/Show', [
            'package' => [
                'id' => $package->id,
                'pet' => $package->pet ? ['id' => $package->pet->id, 'nombre' => $package->pet->nombre] : null,
                'owner' => $package->pet?->owner ? [
                    'id' => $package->pet->owner->id,
                    'nombre' => trim("{$package->pet->owner->nombre} {$package->pet->owner->apellidos}"),
                    'telefono' => $package->pet->owner->telefono,
                ] : null,
                'subtotal' => $package->subtotal,
                'descuento_tipo' => $package->descuento_tipo,
                'descuento_valor' => $package->descuento_valor,
                'total' => $package->total,
                'fecha_vencimiento' => $package->fecha_vencimiento->toDateString(),
                'vencido' => $package->isExpired(),
                'created_at' => $package->created_at->toDateTimeString(),
                'ticket_folio' => $package->ticket?->folio,
                'ticket_id' => $package->pos_ticket_id,
                'items' => $package->items->map(fn($i) => [
                    'id' => $i->id,
                    'nombre' => $i->nombre_snapshot,
                    'precio' => $i->precio_snapshot,
                    'cantidad' => $i->cantidad,
                    'subtotal' => $i->subtotal,
                ]),
                'credits' => $package->credits->map(fn($c) => [
                    'id' => $c->id,
                    'nombre' => $c->nombre_snapshot,
                    'saldo_inicial' => $c->saldo_inicial,
                    'saldo_actual' => $c->saldo_actual,
                    'movements' => $c->movements->map(fn($m) => [
                        'id' => $m->id,
                        'tipo' => $m->tipo,
                        'cantidad' => $m->cantidad,
                        'notas' => $m->notas,
                        'created_at' => $m->created_at->toDateTimeString(),
                    ]),
                ]),
            ],
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
