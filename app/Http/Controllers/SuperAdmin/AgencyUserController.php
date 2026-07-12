<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AgencyUserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('SuperAdmin/AgencyUsers', [
            'users' => User::whereNull('tenant_id')
                ->where('role', 'super_admin')
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'apellido', 'email', 'activo']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre'   => 'required|string|max:255',
            'apellido' => 'nullable|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)],
        ]);

        User::create([
            'nombre'    => $data['nombre'],
            'apellido'  => $data['apellido'] ?? null,
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => 'super_admin',
            'tenant_id' => null,
            'activo'    => true,
        ]);

        return back()->with('success', 'Usuario creado.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->role === 'super_admin' && $user->tenant_id === null, 404);

        $data = $request->validate([
            'nombre'   => 'required|string|max:255',
            'apellido' => 'nullable|string|max:255',
            'email'    => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'activo'   => 'boolean',
        ]);

        if (! ($data['activo'] ?? true)) {
            $this->guardLastSuperAdmin($user);
        }

        $user->update($data);

        return back()->with('success', 'Usuario actualizado.');
    }

    public function updatePassword(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->role === 'super_admin' && $user->tenant_id === null, 404);

        $request->validate([
            'password' => ['required', Password::min(8)],
        ]);

        $user->update(['password' => Hash::make($request->password)]);

        return back()->with('success', 'Contraseña actualizada.');
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_unless($user->role === 'super_admin' && $user->tenant_id === null, 404);
        abort_if($user->id === auth()->id(), 422, 'No puedes eliminar tu propia cuenta.');

        $this->guardLastSuperAdmin($user);

        $user->delete();

        return back()->with('success', 'Usuario eliminado.');
    }

    private function guardLastSuperAdmin(User $user): void
    {
        $remaining = User::whereNull('tenant_id')
            ->where('role', 'super_admin')
            ->where('activo', true)
            ->where('id', '!=', $user->id)
            ->count();

        abort_if($remaining === 0, 422, 'Debe quedar al menos un super admin activo.');
    }
}
