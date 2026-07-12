<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelStayPhoto extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'hotel_stay_photos';

    protected $fillable = [
        'tenant_id',
        'stay_id',
        'etiqueta',
        'url',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function stay(): BelongsTo
    {
        return $this->belongsTo(HotelStay::class, 'stay_id');
    }
}
