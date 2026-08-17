<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantMercadoPagoConfig extends Model
{
    protected $table = 'tenant_mercadopago_configs';

    protected $fillable = [
        'tenant_id',
        'access_token',
        'public_key',
        'webhook_secret',
        'activo',
    ];

    protected $hidden = ['access_token', 'webhook_secret'];

    protected $appends = ['access_token_preview'];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getAccessTokenAttribute($value): ?string
    {
        return $value ? decrypt($value) : null;
    }

    public function setAccessTokenAttribute($value): void
    {
        $this->attributes['access_token'] = $value ? encrypt($value) : null;
    }

    public function getWebhookSecretAttribute($value): ?string
    {
        return $value ? decrypt($value) : null;
    }

    public function setWebhookSecretAttribute($value): void
    {
        $this->attributes['webhook_secret'] = $value ? encrypt($value) : null;
    }

    public function getAccessTokenPreviewAttribute(): ?string
    {
        $token = $this->getAccessTokenAttribute($this->attributes['access_token'] ?? null);
        return $token ? '****' . substr($token, -4) : null;
    }
}
