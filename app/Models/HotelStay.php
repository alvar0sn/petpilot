<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HotelStay extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'space_id',
        'tipo',
        'estado',
        'fecha_entrada',
        'fecha_salida',
        'alimentacion',
        'medicacion',
        'notas',
        'estado_fisico',
        'nota_lesion',
        'objetos_recibidos',
        'motivo_cancelacion',
        'rate_id',
        'precio_por_noche',
        'cobro_membresia',
        'membership_id',
        'creditos_consumidos',
        'package_credit_id',
        'creditos_paquete_consumidos',
        'pos_ticket_id',
        'created_by',
        'responsiva_token',
        'responsiva_texto',
        'responsiva_enviado_at',
        'responsiva_firma_path',
        'responsiva_firmante_nombre',
        'responsiva_firmado_at',
    ];

    protected $casts = [
        'fecha_entrada' => 'datetime',
        'fecha_salida' => 'datetime',
        'precio_por_noche' => 'decimal:2',
        'cobro_membresia' => 'boolean',
        'creditos_consumidos' => 'integer',
        'creditos_paquete_consumidos' => 'integer',
        'responsiva_enviado_at' => 'datetime',
        'responsiva_firmado_at' => 'datetime',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(HotelSpace::class, 'space_id');
    }

    public function rate(): BelongsTo
    {
        return $this->belongsTo(HotelRate::class, 'rate_id');
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function packageCredit(): BelongsTo
    {
        return $this->belongsTo(PackageCredit::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(HotelStayPhoto::class, 'stay_id');
    }

    public function charges(): HasMany
    {
        return $this->hasMany(HotelStayCharge::class, 'stay_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(HotelStayPayment::class, 'stay_id')->orderBy('created_at');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive(): bool
    {
        return in_array($this->estado, ['reservado', 'activo']);
    }
}
