<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosPayment extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_payments';

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'payment_method_id',
        'monto',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'ticket_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PosPaymentMethod::class, 'payment_method_id');
    }
}
