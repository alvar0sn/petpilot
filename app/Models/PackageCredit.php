<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackageCredit extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'package_id',
        'pet_id',
        'pos_catalog_item_id',
        'nombre_snapshot',
        'saldo_inicial',
        'saldo_actual',
        'fecha_vencimiento',
    ];

    protected $casts = [
        'saldo_inicial' => 'decimal:2',
        'saldo_actual' => 'decimal:2',
        'fecha_vencimiento' => 'date',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'pos_catalog_item_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(PackageCreditMovement::class, 'credit_id');
    }

    public function isExpired(): bool
    {
        return $this->fecha_vencimiento->isPast();
    }
}
