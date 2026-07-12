<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MembershipCredit extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'membership_credits';

    protected $fillable = [
        'tenant_id',
        'membership_id',
        'servicio_tipo',
        'saldo_inicial',
        'saldo_actual',
        'proximo_reinicio',
    ];

    protected $casts = [
        'proximo_reinicio' => 'date',
    ];

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(MembershipCreditMovement::class, 'credit_id');
    }

    public function isLow(): bool
    {
        return $this->saldo_actual <= 2;
    }
}
