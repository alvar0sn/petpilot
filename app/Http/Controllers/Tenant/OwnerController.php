<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Jobs\SyncOwnerToGhl;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class OwnerController extends Controller
{
    public function index(Request $request): Response
    {
        $owners = Owner::with([
                'pets:id,owner_id,nombre,tipo,foto_url,estado',
                'pets.memberships' => fn($q) => $q->where('activa', true)
                    ->with('credits:id,membership_id,servicio_tipo,saldo_actual'),
            ])
            ->when($request->search, fn($q, $s) =>
                $q->where(fn($q) =>
                    $q->where('nombre', 'like', "%$s%")
                      ->orWhere('apellidos', 'like', "%$s%")
                      ->orWhere('telefono', 'like', "%$s%")
                      ->orWhere('email', 'like', "%$s%")
                      ->orWhereHas('pets', fn($q) => $q->where('nombre', 'like', "%$s%"))
                )
            )
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn($o) => [
                'id' => $o->id,
                'nombre' => $o->nombre,
                'apellidos' => $o->apellidos,
                'nombre_completo' => $o->nombre_completo,
                'telefono' => $o->telefono,
                'email' => $o->email,
                'direccion' => $o->direccion,
                'ghl_sync_status' => $o->ghl_sync_status,
                'pets_count' => $o->pets->count(),
                'pets' => $o->pets->take($request->search ? 20 : 3)->map(function ($p) {
                    $membership = $p->memberships->first();
                    $creditEst = $membership?->getCredit('estetica');
                    return [
                        'id'                => $p->id,
                        'nombre'            => $p->nombre,
                        'tipo'              => $p->tipo,
                        'membership_id'     => ($creditEst && $creditEst->saldo_actual > 0) ? $membership->id : null,
                        'creditos_estetica' => $creditEst?->saldo_actual ?? 0,
                    ];
                }),
                'created_at' => $o->created_at,
            ]);

        return Inertia::render('Owners/Index', [
            'owners' => $owners,
            'filters' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Owners/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'apellidos' => 'nullable|string|max:255',
            'telefono' => 'required|string|max:30|unique:owners,telefono',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:500',
            'notas' => 'nullable|string',
        ]);

        $owner = Owner::create($data + ['ghl_sync_status' => 'pending']);

        SyncOwnerToGhl::dispatch(currentTenantId(), $owner->id);

        return redirect()->route('owners.show', $owner)
            ->with('success', 'Cliente creado exitosamente.');
    }

    public function show(Owner $owner): Response
    {
        $owner->load([
            'pets'              => fn($q) => $q->withCount('events')->orderBy('estado')->orderBy('nombre'),
            'pets.memberships'  => fn($q) => $q->where('activa', true)->with('plan:id,nombre'),
        ]);

        return Inertia::render('Owners/Show', [
            'owner' => $owner,
        ]);
    }

    public function edit(Owner $owner): Response
    {
        $tenant = app()->bound('current_tenant') ? app('current_tenant') : null;
        return Inertia::render('Owners/Edit', [
            'owner' => $owner,
            'tenant' => $tenant ? ['slug' => $tenant->slug] : null,
        ]);
    }

    public function update(Request $request, Owner $owner): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'apellidos' => 'nullable|string|max:255',
            'telefono' => 'required|string|max:30|unique:owners,telefono,' . $owner->id,
            'email' => 'nullable|email|max:255',
            'portal_password' => 'nullable|string|min:6',
            'direccion' => 'nullable|string|max:500',
            'notas' => 'nullable|string',
        ]);

        if (!empty($data['portal_password'])) {
            $data['password'] = bcrypt($data['portal_password']);
        }
        unset($data['portal_password']);

        $owner->update($data + ['ghl_sync_status' => 'pending']);

        SyncOwnerToGhl::dispatch(currentTenantId(), $owner->id);

        return back()->with('success', 'Cliente actualizado.');
    }

    public function destroy(Owner $owner): RedirectResponse
    {
        $owner->delete();
        return redirect()->route('owners.index')->with('success', 'Cliente eliminado.');
    }

    public function syncGhl(Owner $owner): RedirectResponse
    {
        $owner->update(['ghl_sync_status' => 'pending']);
        SyncOwnerToGhl::dispatch(currentTenantId(), $owner->id);
        return back()->with('success', 'Sync GHL iniciado.');
    }

    public function sendPortalAccess(Owner $owner): RedirectResponse
    {
        if (! $owner->email) {
            return back()->withErrors(['email' => 'Este cliente no tiene email registrado.']);
        }

        Password::broker('owners')->sendResetLink([
            'email' => $owner->email,
            'tenant_id' => $owner->tenant_id,
        ]);

        return back()->with('success', 'Correo de acceso al portal enviado a ' . $owner->email . '.');
    }
}
