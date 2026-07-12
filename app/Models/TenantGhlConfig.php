<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantGhlConfig extends Model
{
    protected $fillable = [
        'tenant_id',
        'api_key',
        'location_id',
        'webhook_recordatorios',
        'webhook_cumpleanos',
        'webhook_reviews',
        'webhook_membresia_vencimiento',
        'webhook_checkin_hotel',
        'webhook_checkout_hotel',
        'webhook_whatsapp_pos',
        'activo',
    ];

    protected $hidden = ['api_key'];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getApiKeyAttribute($value): ?string
    {
        return $value ? decrypt($value) : null;
    }

    public function setApiKeyAttribute($value): void
    {
        $this->attributes['api_key'] = $value ? encrypt($value) : null;
    }

    public function getApiKeyPreviewAttribute(): ?string
    {
        $key = $this->getApiKeyAttribute($this->attributes['api_key'] ?? null);
        return $key ? '****' . substr($key, -4) : null;
    }
}
