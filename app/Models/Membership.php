<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Membership extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'plan_id',
        'fecha_inicio',
        'fecha_vencimiento',
        'activa',
        'congelada',
        'congelada_desde',
        'aviso_enviado',
        'pos_ticket_id',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_vencimiento' => 'date',
        'activa' => 'boolean',
        'congelada' => 'boolean',
        'congelada_desde' => 'date',
        'aviso_enviado' => 'boolean',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'plan_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function credits(): HasMany
    {
        return $this->hasMany(MembershipCredit::class);
    }

    public function creditMovements(): HasMany
    {
        return $this->hasMany(MembershipCreditMovement::class);
    }

    public function getCredit(string $servicioTipo): ?MembershipCredit
    {
        return $this->credits->firstWhere('servicio_tipo', $servicioTipo);
    }

    public function hasCredits(string $servicioTipo): bool
    {
        $credit = $this->getCredit($servicioTipo);
        return $credit && $credit->saldo_actual > 0;
    }

    public function isExpired(): bool
    {
        return $this->fecha_vencimiento->isPast();
    }

    public function diasParaVencer(): int
    {
        return (int) now()->diffInDays($this->fecha_vencimiento, false);
    }
}
