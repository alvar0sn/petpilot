<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PackageItem extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'package_id',
        'pos_catalog_item_id',
        'nombre_snapshot',
        'precio_snapshot',
        'cantidad',
        'subtotal',
    ];

    protected $casts = [
        'precio_snapshot' => 'decimal:2',
        'cantidad' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'pos_catalog_item_id');
    }
}
