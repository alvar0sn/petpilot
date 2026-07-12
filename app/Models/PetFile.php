<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetFile extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'event_id',
        'nombre',
        'tipo_mime',
        'tamanio_bytes',
        'archivo_url',
        'uploaded_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
