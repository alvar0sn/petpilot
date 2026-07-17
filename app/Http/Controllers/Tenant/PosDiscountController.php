<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\PosDiscount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosDiscountController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Pos/Discounts', [
            'discounts' => PosDiscount::orderByDesc('activo')->orderBy('nombre')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre'       => 'required|string|max:100',
            'tipo'         => 'required|in:porcentaje,monto',
            'valor'        => 'required|numeric|min:0',
            'codigo'       => 'nullable|string|max:50',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date|after_or_equal:fecha_inicio',
            'activo'       => 'boolean',
        ]);

        PosDiscount::create($data);

        return back()->with('success', 'Descuento creado.');
    }

    public function update(Request $request, PosDiscount $discount): RedirectResponse
    {
        $data = $request->validate([
            'nombre'       => 'required|string|max:100',
            'tipo'         => 'required|in:porcentaje,monto',
            'valor'        => 'required|numeric|min:0',
            'codigo'       => 'nullable|string|max:50',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date|after_or_equal:fecha_inicio',
            'activo'       => 'boolean',
        ]);

        $discount->update($data);

        return back()->with('success', 'Descuento actualizado.');
    }

    public function destroy(PosDiscount $discount): RedirectResponse
    {
        $discount->delete();

        return back()->with('success', 'Descuento eliminado.');
    }
}
