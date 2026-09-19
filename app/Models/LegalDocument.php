<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LegalDocument extends Model
{
    protected $fillable = [
        'type',
        'version',
        'content',
        'change_summary',
        'published_at',
        'is_current',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'is_current' => 'boolean',
    ];

    public function acceptances(): HasMany
    {
        return $this->hasMany(LegalAcceptance::class);
    }

    public static function current(string $type): ?self
    {
        return static::where('type', $type)->where('is_current', true)->first();
    }

    /**
     * Marca este documento como la versión vigente de su tipo y desmarca
     * cualquier otra — el middleware de aceptación legal solo compara
     * contra el documento con is_current=true.
     */
    public function makeCurrent(): void
    {
        static::where('type', $this->type)->where('id', '!=', $this->id)->update(['is_current' => false]);
        $this->update(['is_current' => true, 'published_at' => $this->published_at ?? now()]);
    }
}
