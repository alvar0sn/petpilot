<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;

class PosTicketConfig extends Model
{
    use HasTenant;

    protected $table = 'pos_ticket_configs';

    protected $fillable = [
        'tenant_id',
        'logo_path',
        'color_primario',
        'color_texto',
        'color_fondo',
        'mensaje_pie',
    ];
}
