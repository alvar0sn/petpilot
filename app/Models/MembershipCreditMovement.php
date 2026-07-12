<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MembershipCreditMovement extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'membership_credit_movements';

    protected $fillable = [
        'tenant_id',
        'membership_id',
        'credit_id',
        'servicio_tipo',
        'tipo',
        'cantidad',
        'saldo_antes',
        'saldo_despues',
        'referencia_tipo',
        'referencia_id',
        'user_id',
        'notas',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function credit(): BelongsTo
    {
        return $this->belongsTo(MembershipCredit::class, 'credit_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
