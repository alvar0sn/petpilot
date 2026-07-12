<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosTicketLine extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_ticket_lines';

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'item_id',
        'nombre_snapshot',
        'precio_snapshot',
        'costo_snapshot',
        'cantidad',
        'subtotal',
    ];

    protected $casts = [
        'precio_snapshot' => 'decimal:2',
        'costo_snapshot' => 'decimal:2',
        'cantidad' => 'decimal:3',
        'subtotal' => 'decimal:2',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'ticket_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'item_id');
    }
}
