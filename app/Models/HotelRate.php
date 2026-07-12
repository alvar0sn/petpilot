<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelRate extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'tipo',
        'unidad',
        'cantidad',
        'precio',
        'pos_item_id',
        'activa',
    ];

    protected $casts = [
        'cantidad' => 'decimal:2',
        'precio' => 'decimal:2',
        'activa' => 'boolean',
    ];

    public function posItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'pos_item_id');
    }
}
