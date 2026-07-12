<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelStayCharge extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'hotel_stay_charges';

    protected $fillable = [
        'tenant_id',
        'stay_id',
        'pos_item_id',
        'concepto',
        'precio_unitario',
        'cantidad',
        'subtotal',
        'created_by',
    ];

    protected $casts = [
        'precio_unitario' => 'decimal:2',
        'cantidad' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function stay(): BelongsTo
    {
        return $this->belongsTo(HotelStay::class, 'stay_id');
    }

    public function posItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'pos_item_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
