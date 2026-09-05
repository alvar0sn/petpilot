<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\PosCatalogItem;
use App\Models\PosCategory;
use App\Models\WalkRate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WalkRateController extends Controller
{
    public function config(): Response
    {
        return Inertia::render('Walks/Config', [
            'rates' => WalkRate::orderBy('nombre')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:grupal,privado',
            'precio' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $posItemId = $this->ensureWalkRateCatalogItem($data['nombre'], $data['precio'])->id;

            WalkRate::create([
                ...$data,
                'pos_item_id' => $posItemId,
                'activa' => true,
            ]);
        });

        return back()->with('success', 'Tarifa de paseo creada.');
    }

    public function update(Request $request, WalkRate $rate): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:grupal,privado',
            'precio' => 'required|numeric|min:0',
            'activa' => 'boolean',
        ]);

        $rate->update($data);

        if ($rate->posItem) {
            $rate->posItem->update(['nombre' => $data['nombre'], 'precio' => $data['precio']]);
        }

        return back()->with('success', 'Tarifa actualizada.');
    }

    public function destroy(WalkRate $rate): RedirectResponse
    {
        $rate->delete();

        return back()->with('success', 'Tarifa eliminada.');
    }

    private function ensureWalkRateCatalogItem(string $nombre, float $precio): PosCatalogItem
    {
        $categoria = PosCategory::firstOrCreate(
            ['nombre' => 'Paseos'],
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
}
