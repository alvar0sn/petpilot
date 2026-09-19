<?php

namespace App\Http\Middleware;

use App\Models\LegalAcceptance;
use App\Models\LegalDocument;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLegalAcceptance
{
    private const TYPES = ['tos', 'data_agreement'];

    private const EXCEPT_ROUTES = [
        'legal.accept',
        'legal.accept.store',
        'legal.terminos',
        'legal.tratamiento-datos',
        'logout',
        'tenant.logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'tenant_admin') {
            return $next($request);
        }

        if (! app()->bound('current_tenant')) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();
        if ($routeName && in_array($routeName, self::EXCEPT_ROUTES, true)) {
            return $next($request);
        }

        if ($this->hasPendingAcceptance(app('current_tenant')->id)) {
            return redirect()->route('legal.accept');
        }

        return $next($request);
    }

    private function hasPendingAcceptance(int $tenantId): bool
    {
        foreach (self::TYPES as $type) {
            $current = LegalDocument::current($type);

            // Si el super-admin todavía no publicó una versión de este tipo,
            // no hay nada que exigir — evita bloquear toda la app antes de
            // que exista contenido legal configurado.
            if (! $current) {
                continue;
            }

            $accepted = LegalAcceptance::where('tenant_id', $tenantId)
                ->where('legal_document_id', $current->id)
                ->exists();

            if (! $accepted) {
                return true;
            }
        }

        return false;
    }
}
