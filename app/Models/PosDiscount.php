<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;

class PosDiscount extends Model
{
    use HasTenant;

    protected $table = 'pos_discounts';

    protected $fillable = [
        'tenant_id',
        'nombre',
        'tipo',
        'valor',
        'codigo',
        'fecha_inicio',
        'fecha_fin',
        'enviar_whatsapp',
        'activo',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
        'enviar_whatsapp' => 'boolean',
        'activo' => 'boolean',
    ];

    public function isValid(): bool
    {
        if (! $this->activo) {
            return false;
        }

        $today = now()->toDateString();

        if ($this->fecha_inicio && $this->fecha_inicio->gt(now())) {
            return false;
        }

        if ($this->fecha_fin && $this->fecha_fin->lt(now())) {
            return false;
        }

        return true;
    }
}
