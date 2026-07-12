<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Owner extends Authenticatable implements CanResetPasswordContract
{
    use CanResetPassword, HasTenant, Notifiable;

    protected $fillable = [
        'tenant_id',
        'ghl_contact_id',
        'ghl_sync_status',
        'nombre',
        'apellidos',
        'telefono',
        'email',
        'password',
        'direccion',
        'notas',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $appends = ['nombre_completo'];

    public function nombreCompleto(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: fn () => trim("{$this->nombre} {$this->apellidos}"),
        );
    }

    public function hasPortalAccess(): bool
    {
        return ! is_null($this->password);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\OwnerPasswordReset(
            token: $token,
            tenantSlug: $this->tenant->slug,
            tenantNombre: $this->tenant->nombre,
        ));
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(PosTicket::class);
    }

    public function ghlLogs(): HasMany
    {
        return $this->hasMany(GhlContactLog::class);
    }
}
