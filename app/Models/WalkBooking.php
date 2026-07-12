<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalkBooking extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'slot_id',
        'pet_id',
        'owner_id',
        'estado',
        'cobro_membresia',
        'membership_id',
        'pos_ticket_id',
        'solicitud_owner',
        'notas',
        'created_by',
    ];

    protected $casts = [
        'cobro_membresia' => 'boolean',
        'solicitud_owner' => 'boolean',
    ];

    public function slot(): BelongsTo
    {
        return $this->belongsTo(WalkSlot::class, 'slot_id');
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
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
