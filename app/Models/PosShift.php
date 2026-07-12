<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosShift extends Model
{
    use HasTenant;

    protected $table = 'pos_shifts';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'fecha_apertura',
        'fecha_cierre',
        'fondo_inicial',
        'efectivo_contado',
        'estado',
    ];

    protected $casts = [
        'fecha_apertura' => 'datetime',
        'fecha_cierre' => 'datetime',
        'fondo_inicial' => 'decimal:2',
        'efectivo_contado' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashMovements(): HasMany
    {
        return $this->hasMany(PosCashMovement::class, 'shift_id');
    }

    public function ticketsOpened(): HasMany
    {
        return $this->hasMany(PosTicket::class, 'shift_open_id');
    }

    public function isOpen(): bool
    {
        return $this->estado === 'abierto';
    }
}
