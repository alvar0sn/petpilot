<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'nombre',
        'precio',
        'moneda',
        'descripcion',
        'activo',
        'orden',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }
}
