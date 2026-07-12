<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WalkSlot extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'tipo',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'cupo_maximo',
        'walker_id',
        'estado',
        'notas',
        'created_by',
    ];

    protected $casts = [
        'fecha' => 'date',
        'cupo_maximo' => 'integer',
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(WalkBooking::class, 'slot_id');
    }

    public function walker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'walker_id');
    }

    public function recurrence(): BelongsTo
    {
        return $this->belongsTo(WalkRecurrence::class, 'recurrence_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function cuposOcupados(): int
    {
        return $this->bookings()->whereIn('estado', ['solicitado', 'aprobado'])->count();
    }

    public function cuposDisponibles(): ?int
    {
        if ($this->cupo_maximo === null) {
            return null;
        }
        return max(0, $this->cupo_maximo - $this->cuposOcupados());
    }

    public function tieneEspacio(): bool
    {
        if ($this->cupo_maximo === null) {
            return true;
        }
        return $this->cuposDisponibles() > 0;
    }
}
