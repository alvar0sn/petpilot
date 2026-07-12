<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleImpersonation
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->has('impersonating_tenant_id') && $request->user()?->role === 'super_admin') {
            $tenantId = $request->session()->get('impersonating_tenant_id');
            $tenant = Tenant::find($tenantId);

            if ($tenant) {
                app()->instance('current_tenant', $tenant);
                app()->instance('impersonating', true);
            }
        }

        return $next($request);
    }
}
