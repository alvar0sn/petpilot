<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('SuperAdmin/Plans/Index', [
            'plans' => Plan::withCount('tenants')->orderBy('orden')->orderBy('nombre')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:255',
            'precio'      => 'required|numeric|min:0',
            'moneda'      => 'required|string|max:10',
            'descripcion' => 'nullable|string|max:255',
            'activo'      => 'boolean',
            'orden'       => 'nullable|integer|min:0',
        ]);

        Plan::create($data);

        return back()->with('success', 'Plan creado.');
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:255',
            'precio'      => 'required|numeric|min:0',
            'moneda'      => 'required|string|max:10',
            'descripcion' => 'nullable|string|max:255',
            'activo'      => 'boolean',
            'orden'       => 'nullable|integer|min:0',
        ]);

        $plan->update($data);

        return back()->with('success', 'Plan actualizado.');
    }

    public function destroy(Plan $plan): RedirectResponse
    {
        if ($plan->tenants()->exists()) {
            return back()->with('error', 'No puedes eliminar un plan que tiene tenants asignados.');
        }

        $plan->delete();

        return back()->with('success', 'Plan eliminado.');
    }
}
