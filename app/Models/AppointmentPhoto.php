<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentPhoto extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'appointment_id',
        'ruta',
        'tipo',
        'descripcion',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
