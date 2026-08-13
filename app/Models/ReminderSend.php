<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReminderSend extends Model
{
    use HasTenant;

    const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'tipo',
        'fecha',
        'origen',
        'user_id',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
