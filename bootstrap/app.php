<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->redirectGuestsTo(function (Request $request) {
            $slug = session('tenant_slug');
            if ($slug && Route::has('tenant.login')) {
                return route('tenant.login', ['tenant' => $slug]);
            }
            return route('login');
        });

        $middleware->web(append: [
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\ResolveTenant::class,
            \App\Http\Middleware\HandleImpersonation::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'tenant' => \App\Http\Middleware\RequireTenant::class,
            'role' => \App\Http\Middleware\RequireRole::class,
            'auth.owner' => \App\Http\Middleware\RequireOwnerAuth::class,
            'module' => \App\Http\Middleware\CheckModulePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Cuando la sesión expira durante una petición Inertia (PUT/PATCH/DELETE
        // incluidos), evitamos el 302 estándar: los navegadores conservan el
        // método original al seguir esa redirección (solo lo cambian a GET para
        // POST), así que un PUT reintentado contra /login truena con "Method Not
        // Allowed". Inertia::location() responde 409 + X-Inertia-Location, que el
        // cliente interpreta como una visita completa (GET) al login.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                $slug = session('tenant_slug');
                $url = ($slug && Route::has('tenant.login'))
                    ? route('tenant.login', ['tenant' => $slug])
                    : route('login');

                return Inertia::location($url);
            }
        });
    })->create();
