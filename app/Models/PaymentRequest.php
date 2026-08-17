<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentRequest extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'pos_ticket_id',
        'token',
        'external_reference',
        'monto',
        'estado',
        'mp_preference_id',
        'mp_init_point',
        'mp_payment_id',
        'pos_payment_id',
        'notas',
        'created_by',
        'paid_at',
        'raw_last_status',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'raw_last_status' => 'array',
        'paid_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (PaymentRequest $request) {
            if (empty($request->token)) {
                do {
                    $token = Str::random(24);
                } while (static::withoutTenantScope()->where('token', $token)->exists());
                $request->token = $token;
            }

            if (empty($request->external_reference)) {
                $request->external_reference = 'pr_' . Str::uuid();
            }
        });
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(PosPayment::class, 'pos_payment_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isPending(): bool
    {
        return $this->estado === 'pendiente';
    }
}
