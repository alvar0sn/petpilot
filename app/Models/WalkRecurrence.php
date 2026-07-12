<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WalkRecurrence extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'tipo',
        'hora_inicio',
        'hora_fin',
        'cupo_maximo',
        'walker_id',
        'recurrence_type',
        'recurrence_days',
        'fecha_inicio',
        'fecha_fin',
        'notas',
        'created_by',
    ];

    protected $casts = [
        'recurrence_days' => 'array',
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
        'cupo_maximo' => 'integer',
    ];

    public function slots(): HasMany
    {
        return $this->hasMany(WalkSlot::class, 'recurrence_id');
    }

    public function walker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'walker_id');
    }

    public function getPatternLabelAttribute(): string
    {
        if ($this->recurrence_type === 'daily') {
            return 'Todos los días';
        }

        $dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        $labels = collect($this->recurrence_days ?? [])
            ->sort()
            ->map(fn ($d) => $dayNames[$d] ?? $d)
            ->join(', ');

        return "Semanal: {$labels}";
    }
}
