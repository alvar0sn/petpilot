<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageCreditMovement extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'credit_id',
        'tipo',
        'cantidad',
        'saldo_antes',
        'saldo_despues',
        'referencia_tipo',
        'referencia_id',
        'user_id',
        'notas',
        'created_at',
    ];

    protected $casts = [
        'cantidad' => 'decimal:2',
        'saldo_antes' => 'decimal:2',
        'saldo_despues' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function credit(): BelongsTo
    {
        return $this->belongsTo(PackageCredit::class, 'credit_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
