<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'apellido',
        'email',
        'password',
        'role',
        'permisos_modulos',
        'activo',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permisos_modulos' => 'array',
            'activo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isTenantAdmin(): bool
    {
        return $this->role === 'tenant_admin';
    }

    public function isColaborador(): bool
    {
        return $this->role === 'colaborador';
    }

    public function hasModulePermission(string $module): bool
    {
        if ($this->role !== 'colaborador') {
            return true;
        }

        // null or empty = full access (backwards-compatible for existing colaboradores)
        if (empty($this->permisos_modulos)) {
            return true;
        }

        return in_array($module, $this->permisos_modulos);
    }

    public function getNameAttribute(): string
    {
        return trim($this->nombre . ' ' . $this->apellido);
    }
}
