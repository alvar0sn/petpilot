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
        'package_credit_id',
        'tipo_viaje',
        'estado',
        'cobro_membresia',
        'membership_id',
        'pos_ticket_id',
        'origen_tipo',
        'origen_id',
        'notas',
        'created_by',
        'responsiva_token',
        'responsiva_texto',
        'responsiva_enviado_at',
        'responsiva_firma_path',
        'responsiva_firmante_nombre',
        'responsiva_firmado_at',
    ];

    protected $casts = [
        'cobro_membresia' => 'boolean',
        'responsiva_enviado_at' => 'datetime',
        'responsiva_firmado_at' => 'datetime',
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

    public function packageCredit(): BelongsTo
    {
        return $this->belongsTo(PackageCredit::class);
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
