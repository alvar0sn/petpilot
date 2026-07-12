<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GhlWebhookLog extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'webhook_type',
        'status',
        'http_code',
        'payload_sent',
        'error_message',
    ];

    protected $casts = [
        'payload_sent' => 'array',
        'created_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
