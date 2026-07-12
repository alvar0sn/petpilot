<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BacklogItem extends Model
{
    protected $fillable = ['title', 'description', 'type', 'status', 'sort_order', 'source_url'];

    public static array $types = [
        'feature'     => ['label' => 'Feature',  'color' => 'bg-blue-100 text-blue-700'],
        'fix'         => ['label' => 'Fix',       'color' => 'bg-red-100 text-red-700'],
        'improvement' => ['label' => 'Mejora',    'color' => 'bg-yellow-100 text-yellow-700'],
    ];

    public static array $columns = [
        'backlog'     => 'Backlog',
        'in_progress' => 'En progreso',
        'done'        => 'Hecho',
    ];
}
