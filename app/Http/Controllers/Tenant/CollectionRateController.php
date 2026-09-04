<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\CollectionRate;
use App\Models\PosCatalogItem;
use App\Models\PosCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CollectionRateController extends Controller
{
    public function config(): Response
    {
        return Inertia::render('Collection/Config', [
            'rates' => CollectionRate::orderBy('cantidad')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'unidad' => 'required|in:km',
            'cantidad' => 'required|numeric|min:0.01',
            'precio' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $posItemId = $this->ensureCollectionRateCatalogItem($data['nombre'], $data['precio'])->id;

            CollectionRate::create([
                ...$data,
                'pos_item_id' => $posItemId,
                'activa' => true,
            ]);
        });

        return back()->with('success', 'Tarifa de recolección creada.');
    }

    public function update(Request $request, CollectionRate $rate): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'unidad' => 'required|in:km',
            'cantidad' => 'required|numeric|min:0.01',
            'precio' => 'required|numeric|min:0',
            'activa' => 'boolean',
        ]);

        $rate->update($data);

        if ($rate->posItem) {
            $rate->posItem->update(['nombre' => $data['nombre'], 'precio' => $data['precio']]);
        }

        return back()->with('success', 'Tarifa actualizada.');
    }

    public function destroy(CollectionRate $rate): RedirectResponse
    {
        $rate->delete();

        return back()->with('success', 'Tarifa eliminada.');
    }

    private function ensureCollectionRateCatalogItem(string $nombre, float $precio): PosCatalogItem
    {
        $categoria = PosCategory::firstOrCreate(
            ['nombre' => 'Recolección'],
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
