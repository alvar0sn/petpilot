<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PosTicket extends Model
{
    use HasTenant;

    protected $table = 'pos_tickets';

    protected $fillable = [
        'tenant_id',
        'folio',
        'token',
        'owner_id',
        'estado',
        'shift_open_id',
        'shift_close_id',
        'user_open_id',
        'user_close_id',
        'user_last_edit_id',
        'discount_id',
        'discount_amount',
        'subtotal',
        'total',
        'comentario_cancelacion',
        'cobrado_at',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'cobrado_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->token)) {
                $ticket->token = Str::uuid();
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function shiftOpen(): BelongsTo
    {
        return $this->belongsTo(PosShift::class, 'shift_open_id');
    }

    public function discount(): BelongsTo
    {
        return $this->belongsTo(PosDiscount::class, 'discount_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PosTicketLine::class, 'ticket_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PosPayment::class, 'ticket_id');
    }

    public function isPaid(): bool
    {
        return $this->estado === 'pagado';
    }
}
