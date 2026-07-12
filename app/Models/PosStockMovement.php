<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosStockMovement extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_stock_movements';

    protected $fillable = [
        'tenant_id',
        'item_id',
        'ticket_id',
        'tipo',
        'cantidad',
        'stock_anterior',
        'stock_nuevo',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'item_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
