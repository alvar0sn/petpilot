<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Jobs\SyncOwnerToGhl;
use App\Models\Owner;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminOwnersController extends Controller
{
    public function index(Request $request): Response
    {
        $search    = $request->input('search', '');
        $tenantId  = $request->input('tenant_id', '');
        $syncStatus = $request->input('sync_status', '');

        $owners = Owner::withoutGlobalScopes()
            ->with([
                'tenant:id,nombre,slug',
                'pets:id,owner_id,nombre,tipo',
            ])
            ->when($search, fn($q) => $q->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('apellidos', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telefono', 'like', "%{$search}%");
            }))
            ->when($tenantId, fn($q) => $q->where('tenant_id', $tenantId))
            ->when($syncStatus === 'synced',  fn($q) => $q->where('ghl_sync_status', 'synced'))
            ->when($syncStatus === 'pending', fn($q) => $q->where('ghl_sync_status', 'pending'))
            ->when($syncStatus === 'failed',  fn($q) => $q->where('ghl_sync_status', 'failed'))
            ->when($syncStatus === 'no_sync', fn($q) => $q->whereNull('ghl_contact_id'))
            ->orderBy('tenant_id')
            ->orderBy('nombre')
            ->paginate(50)
            ->withQueryString()
            ->through(fn($o) => [
                'id'              => $o->id,
                'nombre'          => $o->nombre,
                'apellidos'       => $o->apellidos,
                'email'           => $o->email,
                'telefono'        => $o->telefono,
                'ghl_contact_id'  => $o->ghl_contact_id,
                'ghl_sync_status' => $o->ghl_sync_status,
                'tenant'          => $o->tenant ? ['id' => $o->tenant->id, 'nombre' => $o->tenant->nombre] : null,
                'pets'            => $o->pets->map(fn($p) => ['nombre' => $p->nombre, 'especie' => $p->tipo]),
            ]);

        return Inertia::render('SuperAdmin/Owners', [
            'owners'  => $owners,
            'tenants' => Tenant::orderBy('nombre')->get(['id', 'nombre']),
            'filters' => [
                'search'      => $search,
                'tenant_id'   => $tenantId,
                'sync_status' => $syncStatus,
            ],
        ]);
    }

    public function sync(int $ownerId): RedirectResponse
    {
        $owner = Owner::withoutGlobalScopes()->findOrFail($ownerId);
        $owner->update(['ghl_sync_status' => 'pending']);
        SyncOwnerToGhl::dispatch($owner->tenant_id, $owner->id);
        return back()->with('success', 'Sync iniciado.');
    }

    public function syncBulk(Request $request): RedirectResponse
    {
        $ids = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer'])['ids'];

        Owner::withoutGlobalScopes()
            ->whereIn('id', $ids)
            ->each(function ($owner) {
                $owner->update(['ghl_sync_status' => 'pending']);
                SyncOwnerToGhl::dispatch($owner->tenant_id, $owner->id);
            });

        return back()->with('success', count($ids) . ' clientes enviados a sync.');
    }
}
