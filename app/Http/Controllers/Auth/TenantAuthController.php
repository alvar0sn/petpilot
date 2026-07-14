<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $user = Auth::guard('web')->user();

        if ($user->tenant_id !== $tenant->id || !in_array($user->role, ['tenant_admin', 'colaborador'])) {
            Auth::guard('web')->logout();
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (!$user->activo) {
            Auth::guard('web')->logout();
            throw ValidationException::withMessages([
                'email' => 'Tu cuenta está desactivada.',
            ]);
        }

        $request->session()->regenerate();
        $request->session()->put('tenant_slug', $tenant->slug);

        return redirect()->intended(route('dashboard'));
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
