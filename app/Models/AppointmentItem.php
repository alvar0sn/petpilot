<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentItem extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'appointment_id',
        'catalog_item_id',
        'nombre',
        'precio',
        'cantidad',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'cantidad' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(PosCatalogItem::class, 'catalog_item_id');
    }
}
