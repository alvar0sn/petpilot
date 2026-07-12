<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MembershipPlan extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'nombre',
        'precio',
        'vigencia_dias',
        'reinicio_creditos',
        'pos_item_id',
        'activo',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'activo' => 'boolean',
    ];

    public function posItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'pos_item_id');
    }

    public function planCredits(): HasMany
    {
        return $this->hasMany(MembershipPlanCredit::class, 'plan_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class, 'plan_id');
    }
}
