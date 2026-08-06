<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosTicketRefund extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_ticket_refunds';

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'shift_id',
        'payment_method_id',
        'user_id',
        'monto',
        'motivo',
        'created_at',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'ticket_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(PosShift::class, 'shift_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PosPaymentMethod::class, 'payment_method_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
