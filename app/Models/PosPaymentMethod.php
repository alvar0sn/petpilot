<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;

class PosPaymentMethod extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_payment_methods';

    protected $fillable = [
        'tenant_id',
        'nombre',
        'activo',
        'orden',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];
}
