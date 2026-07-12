<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosCashMovement extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_cash_movements';

    protected $fillable = [
        'tenant_id',
        'shift_id',
        'user_id',
        'tipo',
        'monto',
        'comentario',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(PosShift::class, 'shift_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
