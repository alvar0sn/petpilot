<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'alvaroiu@gmail.com'],
            [
                'nombre'    => 'Álvaro',
                'apellido'  => 'Admin',
                'password'  => 'PetPilot2026!',
                'role'      => 'super_admin',
                'activo'    => true,
                'tenant_id' => null,
            ]
        );
    }
}
