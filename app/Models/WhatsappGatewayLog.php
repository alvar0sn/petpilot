<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;

class WhatsappGatewayLog extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'event',
        'payload',
        'url',
        'status',
        'attempts',
        'last_attempt_at',
        'response_code',
        'response_body',
        'error_message',
    ];

    protected $casts = [
        'payload'         => 'array',
        'last_attempt_at' => 'datetime',
    ];

    public function isPending(): bool { return $this->status === 'pending'; }
    public function isSuccess(): bool { return $this->status === 'success'; }
    public function isFailed(): bool  { return $this->status === 'failed'; }
}
