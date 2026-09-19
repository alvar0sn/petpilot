<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackagePayment extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'package_id',
        'pos_ticket_id',
        'monto',
        'tipo',
        'notas',
        'user_id',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
