<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetServiceConfig extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pet_service_config';

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'event_type_id',
        'frecuencia_dias',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(EventType::class);
    }
}
