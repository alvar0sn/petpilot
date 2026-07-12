<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosCatalogItem extends Model
{
    use HasTenant;

    protected $table = 'pos_catalog_items';

    protected $fillable = [
        'tenant_id',
        'categoria_id',
        'sku',
        'nombre',
        'tipo',
        'precio',
        'costo',
        'stock',
        'activo',
        'comision_tipo',
        'comision_valor',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'costo' => 'decimal:2',
        'comision_valor' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(PosCategory::class, 'categoria_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(PosStockMovement::class, 'item_id');
    }
}
