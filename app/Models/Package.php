<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Package extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'owner_id',
        'subtotal',
        'descuento_tipo',
        'descuento_valor',
        'total',
        'fecha_vencimiento',
        'pos_ticket_id',
        'created_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'descuento_valor' => 'decimal:2',
        'total' => 'decimal:2',
        'fecha_vencimiento' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PackageItem::class);
    }

    public function credits(): HasMany
    {
        return $this->hasMany(PackageCredit::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PackagePayment::class)->orderBy('created_at');
    }

    public function isExpired(): bool
    {
        return $this->fecha_vencimiento->isPast();
    }

    /**
     * Solo cuenta abonos cuyo ticket ya se cobró en POS — un ticket "abierto"
     * en pos_ticket_id todavía no es dinero recibido. Si ese ticket luego se
     * reembolsa (total o parcial), PosTicket::refund() no cambia su `estado`
     * (sigue "pagado"), así que hay que restar `refunded_amount` aquí para
     * no seguir contando como recibido lo que ya se devolvió.
     */
    public function montoPagado(): float
    {
        return (float) $this->payments()
            ->whereHas('ticket', fn($q) => $q->where('estado', 'pagado'))
            ->with('ticket:id,total,refunded_amount')
            ->get()
            ->sum(fn(PackagePayment $p) => max(0, (float) $p->ticket->total - (float) $p->ticket->refunded_amount));
    }

    public function saldoPendiente(): float
    {
        return max(0, round((float) $this->total - $this->montoPagado(), 2));
    }

    public function tieneAdeudo(): bool
    {
        return $this->saldoPendiente() > 0.009;
    }

    public function isPagado(): bool
    {
        return !$this->tieneAdeudo();
    }

    public function diasParaVencer(): int
    {
        return (int) now()->diffInDays($this->fecha_vencimiento, false);
    }
}
