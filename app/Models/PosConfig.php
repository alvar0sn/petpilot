<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;

class PosConfig extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'pos_config';

    protected $fillable = [
        'tenant_id',
        'clave',
        'valor',
    ];

    public static function get(string $clave, ?string $default = null): ?string
    {
        return static::where('clave', $clave)->value('valor') ?? $default;
    }

    public static function set(string $clave, string $valor): void
    {
        static::updateOrCreate(['clave' => $clave], ['valor' => $valor]);
    }
}
