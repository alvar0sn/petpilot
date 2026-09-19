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

    public function renewals(): HasMany
    {
        return $this->hasMany(MembershipRenewal::class);
    }

    public function creditMovements(): HasMany
    {
        return $this->hasMany(MembershipCreditMovement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(MembershipPayment::class)->orderBy('created_at');
    }

    /**
     * La renovación vigente (o la más reciente si no hay ninguna activa) —
     * el adeudo/abonos siempre se calculan sobre este periodo, no sobre el
     * historial completo de la membresía.
     */
    public function currentRenewal(): ?MembershipRenewal
    {
        return $this->relationLoaded('renewals')
            ? $this->renewals->sortByDesc('fecha_fin')->first()
            : $this->renewals()->latest('fecha_fin')->first();
    }

    /**
     * PosTicket::refund() no cambia `estado` al reembolsar (sigue "pagado"),
     * solo incrementa `refunded_amount` — hay que restarlo aquí para que un
     * abono reembolsado deje de contar como dinero recibido.
     */
    public function montoPagadoRenewal(): float
    {
        $renewal = $this->currentRenewal();
        if (!$renewal) {
            return 0;
        }

        return (float) MembershipPayment::where('renewal_id', $renewal->id)
            ->whereHas('ticket', fn($q) => $q->where('estado', 'pagado'))
            ->with('ticket:id,total,refunded_amount')
            ->get()
            ->sum(fn(MembershipPayment $p) => max(0, (float) $p->ticket->total - (float) $p->ticket->refunded_amount));
    }

    public function saldoPendienteRenewal(): float
    {
        $renewal = $this->currentRenewal();
        if (!$renewal) {
            return 0;
        }

        return max(0, round((float) $renewal->monto - $this->montoPagadoRenewal(), 2));
    }

    public function tieneAdeudo(): bool
    {
        $renewal = $this->currentRenewal();
        if (!$renewal || !$renewal->pos_ticket_id) {
            return false;
        }

        return $this->saldoPendienteRenewal() > 0.009;
    }

    /**
     * Si la renovación actual nunca generó ticket (plan sin cobro en POS), no
     * hay nada que exigir — se comporta como siempre. Si sí generó ticket, se
     * necesita al menos un abono cobrado para poder usar los créditos.
     */
    public function creditsUsable(): bool
    {
        $renewal = $this->currentRenewal();
        if (!$renewal || !$renewal->pos_ticket_id) {
            return true;
        }

        return $this->montoPagadoRenewal() > 0.009;
    }

    public function getTieneAdeudoAttribute(): bool
    {
        return $this->tieneAdeudo();
    }

    public function getSaldoPendienteAttribute(): float
    {
        return $this->saldoPendienteRenewal();
    }

    public function getMontoPagadoAttribute(): float
    {
        return $this->montoPagadoRenewal();
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
