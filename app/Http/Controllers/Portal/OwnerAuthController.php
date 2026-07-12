<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OwnerAuthController extends Controller
{
    private function tenantArr(Tenant $tenant): array
    {
        $branding = $tenant->getSetting('branding', []);
        return [
            'nombre'        => $tenant->nombre,
            'slug'          => $tenant->slug,
            'logo'          => $branding['logo']          ?? null,
            'primary_color' => $branding['primary_color'] ?? '#18181b',
        ];
    }

    public function showLogin(Tenant $tenant): Response|RedirectResponse
    {
        if (auth('owner')->check()) {
            return redirect()->route('portal.dashboard', $tenant->slug);
        }

        return Inertia::render('Portal/Login', [
            'tenant' => $this->tenantArr($tenant),
        ]);
    }

    public function login(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $throttleKey = Str::lower($request->input('email')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => "Demasiados intentos fallidos. Intenta de nuevo en {$seconds} segundos.",
            ]);
        }

        if (! Auth::guard('owner')->attempt([
            'email'     => $request->input('email'),
            'password'  => $request->input('password'),
            'tenant_id' => $tenant->id,
        ], $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey, 60);
            throw ValidationException::withMessages([
                'email' => 'Las credenciales no son correctas.',
            ]);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        return redirect()->route('portal.dashboard', $tenant->slug);
    }

    public function logout(Request $request, Tenant $tenant): RedirectResponse
    {
        Auth::guard('owner')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('portal.login', $tenant->slug);
    }

    public function showForgotPassword(Tenant $tenant): Response
    {
        return Inertia::render('Portal/ForgotPassword', [
            'tenant' => $this->tenantArr($tenant),
        ]);
    }

    public function sendResetLink(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        Password::broker('owners')->sendResetLink([
            'email' => $request->email,
            'tenant_id' => $tenant->id,
        ]);

        // Always return success to prevent email enumeration
        return back()->with('status', 'Si existe una cuenta con ese correo, recibirás un enlace en breve.');
    }

    public function showResetPassword(Request $request, Tenant $tenant, string $token): Response
    {
        return Inertia::render('Portal/ResetPassword', [
            'tenant' => $this->tenantArr($tenant),
            'token' => $token,
            'email' => $request->query('email', ''),
        ]);
    }

    public function resetPassword(Request $request, Tenant $tenant): RedirectResponse
    {
        $data = $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::broker('owners')->reset(
            [...$data, 'tenant_id' => $tenant->id],
            function (Owner $owner, string $password) {
                $owner->forceFill(['password' => Hash::make($password)])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => __($status),
            ]);
        }

        return redirect()->route('portal.login', $tenant->slug)
            ->with('status', '¡Contraseña actualizada! Ya puedes iniciar sesión.');
    }
}
