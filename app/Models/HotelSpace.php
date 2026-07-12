<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HotelSpace extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'capacidad',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function stays(): HasMany
    {
        return $this->hasMany(HotelStay::class, 'space_id');
    }

    public function activeStays(): HasMany
    {
        return $this->stays()->whereIn('estado', ['reservado', 'activo']);
    }
}
