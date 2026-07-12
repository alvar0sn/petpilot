<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveTenant($request);

        if ($tenant) {
            app()->instance('current_tenant', $tenant);
        }

        return $next($request);
    }

    private function resolveTenant(Request $request): ?Tenant
    {
        // Priority 1: authenticated staff user's tenant
        if ($user = $request->user()) {
            if ($user->tenant_id) {
                return Tenant::find($user->tenant_id);
            }
        }

        // Priority 2: portal URL — /{slug}/...
        $segments = explode('/', ltrim($request->path(), '/'));
        if ($segments[0] ?? null) {
            $candidate = Tenant::where('slug', $segments[0])->where('estado', 'activo')->first();
            if ($candidate) {
                return $candidate;
            }
        }

        // Priority 3: subdomain resolution
        $host = $request->getHost();
        $tenantDomain = config('app.tenant_domain', env('TENANT_DOMAIN', 'vetrkt.com'));

        if (str_ends_with($host, '.' . $tenantDomain)) {
            $slug = str_replace('.' . $tenantDomain, '', $host);
            return Tenant::where('slug', $slug)->where('estado', 'activo')->first();
        }

        return null;
    }
}
