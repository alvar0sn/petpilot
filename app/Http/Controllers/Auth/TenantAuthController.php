<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TenantAuthController extends Controller
{
    public function showLogin(Tenant $tenant): Response|RedirectResponse
    {
        abort_if($tenant->estado !== 'activo', 404);

        if (Auth::guard('web')->check()) {
            return redirect()->route('dashboard');
        }

        if (Auth::guard('owner')->check()) {
            return redirect()->route('portal.dashboard', $tenant->slug);
        }

        $branding = $tenant->getSetting('branding', []);

        return Inertia::render('Tenant/Login', [
            'tenant' => [
                'nombre'        => $tenant->nombre,
                'slug'          => $tenant->slug,
                'logo'          => $branding['logo'] ?? null,
                'primary_color' => $branding['primary_color'] ?? '#18181b',
            ],
            'status' => session('status'),
        ]);
    }

    public function login(Request $request, Tenant $tenant): RedirectResponse
    {
        abort_if($tenant->estado !== 'activo', 404);

        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $throttleKey = Str::lower($request->input('email')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Demasiados intentos fallidos. Intenta de nuevo en {$seconds} segundos.",
            ]);
        }

        // Try staff auth first
        if (Auth::guard('web')->attempt([
            'email'    => $request->input('email'),
            'password' => $request->input('password'),
        ], $request->boolean('remember'))) {
            $user = Auth::guard('web')->user();

            if ($user->tenant_id === $tenant->id && in_array($user->role, ['tenant_admin', 'colaborador'])) {
                if (! $user->activo) {
                    Auth::guard('web')->logout();
                    throw ValidationException::withMessages([
                        'email' => 'Tu cuenta está desactivada.',
                    ]);
                }

                RateLimiter::clear($throttleKey);
                $request->session()->regenerate();
                $request->session()->put('tenant_slug', $tenant->slug);
                return redirect()->intended(route('dashboard'));
            }

            Auth::guard('web')->logout();
        }

        // Try owner/client auth
        if (Auth::guard('owner')->attempt([
            'email'     => $request->input('email'),
            'password'  => $request->input('password'),
            'tenant_id' => $tenant->id,
        ], $request->boolean('remember'))) {
            RateLimiter::clear($throttleKey);
            $request->session()->regenerate();
            return redirect()->route('portal.dashboard', $tenant->slug);
        }

        RateLimiter::hit($throttleKey, 60);
        throw ValidationException::withMessages([
            'email' => 'Las credenciales no son correctas.',
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        $slug = Auth::guard('web')->user()?->tenant?->slug ?? session('tenant_slug');

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($slug) {
            return redirect()->route('tenant.login', ['tenant' => $slug]);
        }

        return redirect('/');
    }
}
