<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalkRate extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'tipo',
        'precio',
        'pos_item_id',
        'activa',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'activa' => 'boolean',
    ];

    public function posItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'pos_item_id');
    }
}
