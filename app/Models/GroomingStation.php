<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GroomingStation extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'activo',
        'orden',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'station_id');
    }
}
