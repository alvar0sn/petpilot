<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    public function start(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->session()->put('impersonating_tenant_id', $tenant->id);

        return redirect('/dashboard')->with('success', "Ahora estás viendo el panel de {$tenant->nombre}.");
    }

    public function stop(Request $request): RedirectResponse
    {
        $request->session()->forget('impersonating_tenant_id');

        return redirect()->route('super-admin.index');
    }
}
