<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'owner_id',
        'tipo_servicio_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'estado',
        'modulo',
        'groomer_id',
        'station_id',
        'notas_internas',
        'accesorios',
        'recepcion',
        'created_via',
        'event_id',
        'stay_id',
        'pos_ticket_id',
        'cobro_membresia',
        'membership_id',
        'created_by',
    ];

    protected $casts = [
        'fecha' => 'date',
        'cobro_membresia' => 'boolean',
        'recepcion' => 'array',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function tipoServicio(): BelongsTo
    {
        return $this->belongsTo(EventType::class, 'tipo_servicio_id');
    }

    public function groomer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'groomer_id');
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(GroomingStation::class, 'station_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(AppointmentItem::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(AppointmentPhoto::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
