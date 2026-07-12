<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    protected $fillable = [
        'nombre',
        'slug',
        'timezone',
        'dominio_custom',
        'estado',
        'plan_precio',
        'notas_internas',
        'settings',
    ];

    protected $casts = [
        'estado'   => 'string',
        'settings' => 'array',
    ];

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings ?? [], $key, $default);
    }

    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings ?? [];
        data_set($settings, $key, $value);
        $this->update(['settings' => $settings]);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function ghlConfig(): HasOne
    {
        return $this->hasOne(TenantGhlConfig::class);
    }

    public function owners(): HasMany
    {
        return $this->hasMany(Owner::class);
    }

    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    public function isActive(): bool
    {
        return $this->estado === 'activo';
    }
}
