<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ResetSuperAdmin extends Command
{
    protected $signature = 'app:reset-super-admin';
    protected $description = 'Create or reset the super admin user';

    public function handle(): void
    {
        $email    = 'alvaroiu@gmail.com';
        $password = Hash::make('PetPilot2026!');

        $exists = DB::table('users')->where('email', $email)->exists();

        if ($exists) {
            DB::table('users')->where('email', $email)->update([
                'password' => $password,
                'role'     => 'super_admin',
                'activo'   => true,
            ]);
            $this->info("Password actualizado para {$email}");
        } else {
            DB::table('users')->insert([
                'nombre'    => 'Álvaro',
                'apellido'  => 'Admin',
                'email'     => $email,
                'password'  => $password,
                'role'      => 'super_admin',
                'activo'    => true,
                'tenant_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->info("Super admin creado: {$email}");
        }
    }
}
