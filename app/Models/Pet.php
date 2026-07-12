<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pet extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'owner_id',
        'nombre',
        'foto_url',
        'raza',
        'tipo',
        'tamanio',
        'sexo',
        'esterilizado',
        'peso',
        'nivel_agresividad',
        'fecha_nacimiento',
        'alergias',
        'padecimientos',
        'obs_comportamiento',
        'num_expediente',
        'estado',
        'recordatorio_vacuna',
        'recordatorio_despa',
        'recordatorio_consulta',
        'recordatorio_estetica',
    ];

    protected $casts = [
        'esterilizado' => 'boolean',
        'peso' => 'decimal:2',
        'fecha_nacimiento' => 'date',
        'recordatorio_vacuna' => 'date',
        'recordatorio_despa' => 'date',
        'recordatorio_consulta' => 'date',
        'recordatorio_estetica' => 'date',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class)->orderByDesc('fecha');
    }

    public function serviceConfigs(): HasMany
    {
        return $this->hasMany(PetServiceConfig::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(PetFile::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function activeMembership(): HasOne
    {
        return $this->hasOne(Membership::class)->where('activa', true)->latestOfMany('fecha_inicio');
    }

    public function hotelStays(): HasMany
    {
        return $this->hasMany(HotelStay::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class)->orderByDesc('fecha');
    }

    public function getEdadAttribute(): ?string
    {
        if (! $this->fecha_nacimiento) {
            return null;
        }

        return $this->fecha_nacimiento->diffForHumans(now(), true);
    }
}
