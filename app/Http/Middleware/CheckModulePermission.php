<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModulePermission
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();

        // Super admin impersonating → full access
        if ($user?->isSuperAdmin() && app()->bound('impersonating')) {
            return $next($request);
        }

        // Tenant admin → full access
        if ($user?->isTenantAdmin()) {
            return $next($request);
        }

        // Colaborador → check module permission
        if ($user?->isColaborador()) {
            if (! $user->hasModulePermission($module)) {
                abort(403, "No tienes acceso al módulo: {$module}.");
            }
            return $next($request);
        }

        abort(403);
    }
}
