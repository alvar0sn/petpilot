<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectionSlot extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'cupo_maximo',
        'recolector_id',
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
        return $this->hasMany(CollectionBooking::class, 'slot_id');
    }

    public function recolector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recolector_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function cuposOcupados(): int
    {
        return $this->bookings()->whereIn('estado', ['programado', 'en_ruta'])->count();
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

    /** Agrupa las reservas activas del slot por dueño — cada grupo es una "parada" física. */
    public function paradas()
    {
        return $this->bookings()
            ->whereIn('estado', ['programado', 'en_ruta', 'completado'])
            ->with(['pet:id,nombre', 'owner:id,nombre,apellidos'])
            ->get()
            ->groupBy('owner_id');
    }
}
