<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionBooking extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'slot_id',
        'pet_id',
        'owner_id',
        'direccion',
        'ubicacion_url',
        'rate_id',
        'tipo_viaje',
        'estado',
        'cobro_membresia',
        'membership_id',
        'pos_ticket_id',
        'origen_tipo',
        'origen_id',
        'notas',
        'created_by',
    ];

    protected $casts = [
        'cobro_membresia' => 'boolean',
    ];

    public function slot(): BelongsTo
    {
        return $this->belongsTo(CollectionSlot::class, 'slot_id');
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function rate(): BelongsTo
    {
        return $this->belongsTo(CollectionRate::class, 'rate_id');
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
