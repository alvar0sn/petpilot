<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'event_type_id',
        'fecha',
        'notas',
        'foto_url',
        'peso',
        'proximo_recordatorio',
        'recordatorio_enviado',
        'vacuna_nombre',
        'vacuna_lote',
        'vacuna_laboratorio',
        'despa_producto',
        'despa_via',
        'consulta_peso',
        'consulta_temperatura',
        'consulta_motivo',
        'consulta_diagnostico',
        'consulta_medicamentos',
        'consulta_proxima_cita',
        'est_verrugas',
        'est_pulgas',
        'est_secreciones',
        'est_lesiones',
        'est_alergias',
        'est_manto',
        'appointment_id',
        'created_by',
    ];

    protected $casts = [
        'fecha' => 'date',
        'proximo_recordatorio' => 'date',
        'consulta_proxima_cita' => 'date',
        'recordatorio_enviado' => 'boolean',
        'est_verrugas' => 'boolean',
        'est_pulgas' => 'boolean',
        'est_secreciones' => 'boolean',
        'est_lesiones' => 'boolean',
        'est_alergias' => 'boolean',
        'peso' => 'decimal:2',
        'consulta_peso' => 'decimal:2',
        'consulta_temperatura' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(EventType::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function checklistItems(): BelongsToMany
    {
        return $this->belongsToMany(ChecklistItem::class, 'event_checklist');
    }

    public function files(): HasMany
    {
        return $this->hasMany(PetFile::class);
    }
}
