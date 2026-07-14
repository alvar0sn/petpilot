<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;

class Raza extends Model
{
    use HasTenant;

    protected $fillable = ['tenant_id', 'nombre', 'tipo'];
}
