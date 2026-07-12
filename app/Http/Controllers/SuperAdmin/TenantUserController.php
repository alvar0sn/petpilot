<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class TenantUserController extends Controller
{
    public function store(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'apellido' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:tenant_admin,colaborador',
            'password' => ['required', Password::min(8)],
        ]);

        $tenant->users()->create([
            'nombre' => $request->nombre,
            'apellido' => $request->apellido,
            'email' => $request->email,
            'role' => $request->role,
            'password' => Hash::make($request->password),
            'activo' => true,
        ]);

        return back()->with('success', 'Usuario creado.');
    }

    public function update(Request $request, Tenant $tenant, User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === $tenant->id, 404);

        $request->validate([
            'nombre' => 'required|string|max:255',
            'apellido' => 'nullable|string|max:255',
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => 'required|in:tenant_admin,colaborador',
            'activo' => 'boolean',
        ]);

        if (! $request->boolean('activo') || $request->role !== 'tenant_admin') {
            $this->guardLastTenantAdmin($tenant, $user);
        }

        $user->update($request->only('nombre', 'apellido', 'email', 'role', 'activo'));

        return back()->with('success', 'Usuario actualizado.');
    }

    public function updatePassword(Request $request, Tenant $tenant, User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === $tenant->id, 404);

        $request->validate([
            'password' => ['required', Password::min(8)],
        ]);

        $user->update(['password' => Hash::make($request->password)]);

        return back()->with('success', 'Contraseña actualizada.');
    }

    public function destroy(Tenant $tenant, User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === $tenant->id, 404);

        if ($user->role === 'tenant_admin') {
            $this->guardLastTenantAdmin($tenant, $user);
        }

        $user->delete();

        return back()->with('success', 'Usuario eliminado.');
    }

    private function guardLastTenantAdmin(Tenant $tenant, User $user): void
    {
        $remainingAdmins = $tenant->users()
            ->where('role', 'tenant_admin')
            ->where('activo', true)
            ->where('id', '!=', $user->id)
            ->count();

        abort_if($remainingAdmins === 0, 422, 'El tenant debe conservar al menos un usuario administrador activo.');
    }
}
