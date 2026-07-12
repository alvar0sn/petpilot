<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PosCategory extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_categories';

    protected $fillable = [
        'tenant_id',
        'nombre',
        'orden',
        'activo',
        'es_grooming',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'es_grooming' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PosCatalogItem::class, 'categoria_id');
    }
}
