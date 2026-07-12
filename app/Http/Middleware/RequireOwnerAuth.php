<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireOwnerAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth('owner')->check()) {
            $segments = explode('/', ltrim($request->path(), '/'));
            $slug = $segments[0] ?? '';
            return redirect()->route('portal.login', ['tenant' => $slug]);
        }

        // Verify owner belongs to the tenant in the URL
        $segments = explode('/', ltrim($request->path(), '/'));
        $slug = $segments[0] ?? '';
        $owner = auth('owner')->user();

        if ($owner->tenant->slug !== $slug) {
            auth('owner')->logout();
            return redirect()->route('portal.login', ['tenant' => $slug]);
        }

        return $next($request);
    }
}
