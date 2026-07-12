<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventType extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'intervalo_dias',
        'es_configurable',
        'activo',
    ];

    protected $casts = [
        'es_configurable' => 'boolean',
        'activo' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
