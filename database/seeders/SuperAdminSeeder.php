<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'alvaroiu@gmail.com'],
            [
                'nombre'    => 'Álvaro',
                'apellido'  => 'Admin',
                'password'  => Hash::make('PetPilot2026!'),
                'role'      => 'super_admin',
                'activo'    => true,
                'tenant_id' => null,
            ]
        );
    }
}
