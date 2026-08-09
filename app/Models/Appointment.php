<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasTenant;

    public const RESPONSIVA_TEXTO_DEFAULT = <<<'TEXTO'
Autorizo al personal del negocio a realizar el servicio de estética/grooming a mi mascota. Declaro que la información proporcionada sobre su salud y comportamiento es verídica.

Entiendo que, aunque el personal toma todas las precauciones necesarias, existen riesgos inherentes al proceso de baño y corte (estrés, cortes accidentales menores, reacciones alérgicas a productos, entre otros), especialmente en mascotas de edad avanzada, con condiciones médicas preexistentes o con comportamiento agresivo/ansioso.

Por lo anterior, eximo de responsabilidad al negocio y a su personal por cualquier incidente menor derivado del servicio, siempre que se haya actuado con el debido cuidado profesional. En caso de emergencia médica durante el servicio, autorizo al personal a trasladar a mi mascota a atención veterinaria, corriendo los gastos por mi cuenta.
TEXTO;

    protected $fillable = [
        'tenant_id',
        'pet_id',
        'owner_id',
        'tipo_servicio_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'estado',
        'modulo',
        'groomer_id',
        'station_id',
        'notas_internas',
        'accesorios',
        'recepcion',
        'created_via',
        'solicitud_owner',
        'franja',
        'responsiva_token',
        'responsiva_texto',
        'responsiva_enviado_at',
        'responsiva_firma_path',
        'responsiva_firmante_nombre',
        'responsiva_firmado_at',
        'event_id',
        'stay_id',
        'pos_ticket_id',
        'cobro_membresia',
        'membership_id',
        'created_by',
    ];

    protected $casts = [
        'fecha' => 'date',
        'cobro_membresia' => 'boolean',
        'solicitud_owner' => 'boolean',
        'recepcion' => 'array',
        'responsiva_enviado_at' => 'datetime',
        'responsiva_firmado_at' => 'datetime',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function tipoServicio(): BelongsTo
    {
        return $this->belongsTo(EventType::class, 'tipo_servicio_id');
    }

    public function groomer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'groomer_id');
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(GroomingStation::class, 'station_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(PosTicket::class, 'pos_ticket_id');
    }

    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(AppointmentItem::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(AppointmentPhoto::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
