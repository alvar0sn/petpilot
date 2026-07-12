<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $tenant = app()->bound('current_tenant') ? app('current_tenant') : null;
        $impersonating = app()->bound('impersonating') ? app('impersonating') : false;

        $walksPendingCount = 0;
        $activeTenantId = $tenant?->id ?? $request->user()?->tenant_id;
        if ($activeTenantId && $request->user()) {
            $walksPendingCount = (int) DB::table('walk_bookings')
                ->where('tenant_id', $activeTenantId)
                ->where('estado', 'solicitado')
                ->where('solicitud_owner', 1)
                ->count();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'nombre' => $request->user()->nombre,
                    'apellido' => $request->user()->apellido,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'permisos_modulos' => $request->user()->permisos_modulos,
                ] : null,
                'owner' => auth('owner')->check() ? [
                    'id' => auth('owner')->user()->id,
                    'nombre' => auth('owner')->user()->nombre,
                    'apellidos' => auth('owner')->user()->apellidos,
                ] : null,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'nombre' => $tenant->nombre,
                'slug' => $tenant->slug,
                'timezone' => $tenant->timezone,
            ] : null,
            'impersonating' => $impersonating,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'walks_pending_count' => $walksPendingCount,
        ];
    }
}
