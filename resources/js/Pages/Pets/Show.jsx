import Lightbox from '@/Components/Lightbox';
import TenantLayout from '@/Layouts/TenantLayout';
import { compressImage } from '@/utils/compressImage';
import { Link, router, useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { dateKeyInTimezone, formatDate, useTenantTimezone } from '@/lib/datetime';

const agresividadConfig = {
    tranquilo:  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'tranquilo' },
    precaucion: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       label: 'precaución' },
    agresivo:   { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',           label: 'agresivo'   },
};

function calcEdad(fechaNac) {
    if (!fechaNac) return null;
    const [y, m, d] = fechaNac.split('-').map(Number);
    const now = new Date();
    let years = now.getFullYear() - y;
    let months = now.getMonth() + 1 - m;
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} año${years !== 1 ? 's' : ''}`;
    if (months > 0) return `${months} mes${months !== 1 ? 'es' : ''}`;
    return 'recién nacido';
}

const tipoBadge = { perro: '🐶', gato: '🐱', roedor: '🐭', reptil: '🦎', otro: '🐾' };

const eventColors = {
    Estética: 'bg-purple-100 border-purple-300 text-purple-800',
    Vacuna: 'bg-blue-100 border-blue-300 text-blue-800',
    Desparasitación: 'bg-orange-100 border-orange-300 text-orange-800',
    Consulta: 'bg-teal-100 border-teal-300 text-teal-800',
};

function NewEventForm({ petId, eventTypes, onCancel }) {
    const tz = useTenantTimezone();

    const allowedTypes = eventTypes.filter(t => t.nombre === 'Vacuna' || t.nombre === 'Desparasitación');

    const { data, setData, post, processing, errors, reset } = useForm({
        event_type_id: allowedTypes[0]?.id ?? '',
        fecha: dateKeyInTimezone(new Date(), tz),
        peso: '',
        notas: '',
        vacuna_nombre: '',
        vacuna_lote: '',
        vacuna_laboratorio: '',
        despa_producto: '',
        despa_via: '',
        proximo_recordatorio: '',
    });

    const selectedType = allowedTypes.find(t => t.id == data.event_type_id);
    const typeName = selectedType?.nombre;

    function submit(e) {
        e.preventDefault();
        post(route('events.store', petId), {
            onSuccess: () => { reset(); onCancel(); },
        });
    }

    return (
        <form onSubmit={submit} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-zinc-800 text-sm">Nuevo evento</h3>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.event_type_id} onChange={e => setData('event_type_id', e.target.value)}>
                        {allowedTypes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha *</label>
                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.fecha} onChange={e => setData('fecha', e.target.value)} />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Peso (kg)</label>
                    <input type="number" step="0.1" className="w-full border-gray-300 rounded-lg text-sm" value={data.peso} onChange={e => setData('peso', e.target.value)} />
                </div>
            </div>

            {typeName === 'Vacuna' && (
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre de la vacuna</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={data.vacuna_nombre} onChange={e => setData('vacuna_nombre', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Lote</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm font-mono" value={data.vacuna_lote} onChange={e => setData('vacuna_lote', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Laboratorio</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={data.vacuna_laboratorio} onChange={e => setData('vacuna_laboratorio', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Próxima vacuna sugerida</label>
                        <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.proximo_recordatorio} onChange={e => setData('proximo_recordatorio', e.target.value)} />
                    </div>
                </div>
            )}

            {typeName === 'Desparasitación' && (
                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Producto</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={data.despa_producto} onChange={e => setData('despa_producto', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Vía</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={data.despa_via} onChange={e => setData('despa_via', e.target.value)} placeholder="oral, tópica..." />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Próxima desparasitación sugerida</label>
                        <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.proximo_recordatorio} onChange={e => setData('proximo_recordatorio', e.target.value)} />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
                <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.notas} onChange={e => setData('notas', e.target.value)} />
            </div>

            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onCancel} className="bg-white border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={processing} className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 text-sm font-medium transition-colors disabled:opacity-50">
                    {processing ? 'Guardando...' : 'Guardar evento'}
                </button>
            </div>
        </form>
    );
}

function EventCard({ event }) {
    const tz = useTenantTimezone();
    const typeName = event.event_type?.nombre ?? 'Evento';
    const colorClass = eventColors[typeName] ?? 'bg-zinc-100 border-zinc-300 text-zinc-800';

    function handleDelete() {
        if (confirm('¿Eliminar este evento?')) {
            router.delete(route('events.destroy', event.id));
        }
    }

    return (
        <div className={`border rounded-lg p-3 text-sm ${colorClass}`}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{typeName}</span>
                        {event.peso && <span className="text-xs opacity-75">{event.peso}kg</span>}
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">
                        {formatDate(event.fecha, tz, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                <div className="flex gap-1">
                    {!MEDICO_TIPOS.includes(typeName) && (
                        <>
                            <Link href={route('events.edit', event.id)} className="text-xs underline opacity-70 hover:opacity-100">editar</Link>
                            <span className="opacity-40">·</span>
                        </>
                    )}
                    <button onClick={handleDelete} className="text-xs underline opacity-70 hover:opacity-100">eliminar</button>
                </div>
            </div>

            {/* Datos específicos */}
            {typeName === 'Vacuna' && event.vacuna_nombre && (
                <p className="text-xs mt-1 opacity-80">{event.vacuna_nombre} — {event.vacuna_laboratorio}</p>
            )}
            {typeName === 'Desparasitación' && event.despa_producto && (
                <p className="text-xs mt-1 opacity-80">{event.despa_producto} ({event.despa_via})</p>
            )}
            {typeName === 'Consulta' && event.consulta_motivo && (
                <p className="text-xs mt-1 opacity-80">Motivo: {event.consulta_motivo}</p>
            )}
            {event.notas && <p className="text-xs mt-1 opacity-70 italic">{event.notas}</p>}
            {typeName === 'Estética' && event.appointment_id && (
                <Link href={route('grooming.show', event.appointment_id)} className="text-xs underline opacity-70 hover:opacity-100 block mt-1">
                    Ver ficha completa →
                </Link>
            )}
            {typeName === 'Consulta' && event.appointment_id && (
                <Link href={route('vet.show', event.appointment_id)} className="text-xs underline opacity-70 hover:opacity-100 block mt-1">
                    Ver ficha de consulta →
                </Link>
            )}

            {event.proximo_recordatorio && (
                <div className="mt-2 text-xs">
                    Próximo recordatorio: <strong>{formatDate(event.proximo_recordatorio, tz)}</strong>
                </div>
            )}
        </div>
    );
}

const HOTEL_ESTADOS = {
    reservado: 'Reservado',
    activo: 'Activo',
    checkout: 'Check-out',
};

const WALK_ESTADOS = {
    solicitado: 'Solicitado',
    aprobado: 'Aprobado',
    completado: 'Completado',
};

function HotelCard({ stay }) {
    const tz = useTenantTimezone();
    const tipoLabel = stay.tipo === 'hotel' ? 'Hotel' : 'Guardería';
    const colorClass = stay.tipo === 'hotel'
        ? 'bg-sky-100 border-sky-300 text-sky-800'
        : 'bg-cyan-100 border-cyan-300 text-cyan-800';

    return (
        <div className={`border rounded-lg p-3 text-sm ${colorClass}`}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-semibold">{tipoLabel}</div>
                    <div className="text-xs opacity-75 mt-0.5">
                        Entrada: {formatDate(stay.fecha_entrada, tz)}
                        {stay.fecha_salida && <> · Salida: {formatDate(stay.fecha_salida, tz)}</>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs opacity-70">{HOTEL_ESTADOS[stay.estado] ?? stay.estado}</span>
                    <Link href={route('hotel.show', stay.id)} className="text-xs underline opacity-70 hover:opacity-100 ml-1">ver</Link>
                </div>
            </div>
            {stay.notas && <p className="text-xs mt-1 opacity-70 italic">{stay.notas}</p>}
        </div>
    );
}

function PaseoCard({ booking }) {
    const tz = useTenantTimezone();
    return (
        <div className="border rounded-lg p-3 text-sm bg-emerald-100 border-emerald-300 text-emerald-800">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-semibold">Paseo</div>
                    <div className="text-xs opacity-75 mt-0.5">
                        {booking.fecha ? formatDate(booking.fecha, tz) : '—'}
                        {booking.hora_inicio && <> · {booking.hora_inicio.slice(0, 5)}</>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs opacity-70">{WALK_ESTADOS[booking.estado] ?? booking.estado}</span>
                    <Link href={route('walks.show', booking.slot_id)} className="text-xs underline opacity-70 hover:opacity-100 ml-1">ver</Link>
                </div>
            </div>
            {booking.notas && <p className="text-xs mt-1 opacity-70 italic">{booking.notas}</p>}
        </div>
    );
}

function ProximaBadge({ dateStr, tz }) {
    if (!dateStr) return null;
    const ymd = String(dateStr).slice(0, 10);
    const days = daysFrom(ymd);
    const cls = days < 0
        ? 'text-red-600 bg-red-50 border-red-200'
        : days <= 7  ? 'text-amber-600 bg-amber-50 border-amber-200'
        : days <= 30 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
        : 'text-green-600 bg-green-50 border-green-200';
    const label = days < 0
        ? `Venció hace ${Math.abs(days)}d`
        : days === 0 ? 'Hoy'
        : `Próxima en ${days}d`;
    return (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
            {label} · {formatDate(ymd, tz)}
        </span>
    );
}

function EsquemaSection({ events, tz }) {
    const lastVacuna = (events ?? []).find(e => e.event_type?.nombre === 'Vacuna');
    const lastDespa  = (events ?? []).find(e => e.event_type?.nombre === 'Desparasitación');

    if (!lastVacuna && !lastDespa) return null;

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Esquema médico</h3>

            {lastVacuna && (
                <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">💉 Vacunas</p>
                    <div className="text-xs rounded-lg px-3 py-2 bg-zinc-50 border border-zinc-200 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="font-medium text-zinc-800">{lastVacuna.vacuna_nombre || 'Vacuna'}</span>
                            <span className="text-zinc-400 shrink-0">{formatDate(lastVacuna.fecha, tz)}</span>
                        </div>
                        {lastVacuna.vacuna_laboratorio && (
                            <p className="text-zinc-500">{lastVacuna.vacuna_laboratorio}{lastVacuna.vacuna_lote ? ` · Lote: ${lastVacuna.vacuna_lote}` : ''}</p>
                        )}
                        <ProximaBadge dateStr={lastVacuna.proximo_recordatorio} tz={tz} />
                    </div>
                </div>
            )}

            {lastDespa && (
                <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">🐛 Desparasitación</p>
                    <div className="text-xs rounded-lg px-3 py-2 bg-zinc-50 border border-zinc-200 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="font-medium text-zinc-800">
                                {lastDespa.despa_producto || 'Desparasitación'}
                                {lastDespa.despa_via && <span className="text-zinc-400 font-normal ml-1">· {lastDespa.despa_via}</span>}
                            </span>
                            <span className="text-zinc-400 shrink-0">{formatDate(lastDespa.fecha, tz)}</span>
                        </div>
                        <ProximaBadge dateStr={lastDespa.proximo_recordatorio} tz={tz} />
                    </div>
                </div>
            )}
        </div>
    );
}

const FILTROS = [
    { key: 'todos',    label: 'Todos' },
    { key: 'medico',   label: 'Médico' },
    { key: 'hotel',    label: 'Hotel / Guardería' },
    { key: 'estetica', label: 'Estética' },
    { key: 'paseo',    label: 'Paseos' },
];

const MEDIA_TIPOS = [
    { key: 'todos',    label: 'Todas' },
    { key: 'perfil',   label: 'Perfil' },
    { key: 'grooming', label: 'Grooming' },
    { key: 'hotel',    label: 'Hotel' },
    { key: 'consulta', label: 'Consultas' },
];

const MEDIA_TIPO_BADGE = {
    perfil:   'bg-zinc-100 text-zinc-600',
    grooming: 'bg-purple-100 text-purple-700',
    hotel:    'bg-blue-100 text-blue-700',
    consulta: 'bg-teal-100 text-teal-700',
};

function MediaGallery({ media }) {
    const [tipoFiltro, setTipoFiltro] = useState('todos');
    const [lightbox, setLightbox] = useState(null);

    const filtered = tipoFiltro === 'todos' ? media : media.filter(p => p.tipo === tipoFiltro);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {MEDIA_TIPOS.map(t => (
                    <button key={t.key} onClick={() => setTipoFiltro(t.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            tipoFiltro === t.key
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
                    Sin fotos para este filtro.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {filtered.map((photo, i) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-zinc-100 aspect-square">
                            <img
                                src={photo.url}
                                alt={photo.descripcion ?? ''}
                                className="w-full h-full object-cover cursor-zoom-in"
                                onClick={() => setLightbox({ photos: filtered, index: i })}
                            />
                            <div className="absolute top-1.5 left-1.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${MEDIA_TIPO_BADGE[photo.tipo]}`}>
                                    {photo.tipo}
                                </span>
                            </div>
                            {photo.fecha && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 text-right">
                                    {photo.fecha}
                                </div>
                            )}
                            <a
                                href={photo.url}
                                download
                                onClick={e => e.stopPropagation()}
                                className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Descargar"
                            >
                                ↓
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {lightbox && (
                <Lightbox
                    photos={lightbox.photos}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onPrev={() => setLightbox(lb => ({ ...lb, index: lb.index - 1 }))}
                    onNext={() => setLightbox(lb => ({ ...lb, index: lb.index + 1 }))}
                />
            )}
        </div>
    );
}

const MEDICO_TIPOS = ['Vacuna', 'Desparasitación', 'Consulta'];

const RECORDATORIOS_CONFIG = [
    { key: 'recordatorio_vacuna',   label: 'Vacuna',          color: 'blue' },
    { key: 'recordatorio_despa',    label: 'Desparasitación', color: 'orange' },
    { key: 'recordatorio_consulta', label: 'Consulta',        color: 'teal' },
    { key: 'recordatorio_estetica', label: 'Estética',        color: 'purple' },
];

function daysFrom(dateStr) {
    if (!dateStr) return null;
    const ymd = String(dateStr).slice(0, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(ymd + 'T00:00:00');
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function RecordatoriosSection({ pet, maxDays = null }) {
    const recForm = useForm({
        recordatorio_vacuna:   pet.recordatorio_vacuna   ?? '',
        recordatorio_despa:    pet.recordatorio_despa    ?? '',
        recordatorio_consulta: pet.recordatorio_consulta ?? '',
        recordatorio_estetica: pet.recordatorio_estetica ?? '',
    });
    const [editing, setEditing] = useState(false);

    function save(e) {
        e.preventDefault();
        recForm.put(route('pets.recordatorios.update', pet.id), { onSuccess: () => setEditing(false) });
    }

    const visibleConfigs = maxDays !== null
        ? RECORDATORIOS_CONFIG.filter(({ key }) => {
            const d = daysFrom(pet[key]);
            return pet[key] && d !== null && d >= 0 && d <= maxDays;
          })
        : RECORDATORIOS_CONFIG;

    const hasAny = RECORDATORIOS_CONFIG.some(r => pet[r.key]);

    if (maxDays !== null && visibleConfigs.length === 0) return null;

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    {maxDays !== null ? `Recordatorios próximos` : 'Recordatorios'}
                </h3>
                {maxDays === null && (
                    <button onClick={() => setEditing(e => !e)} className="text-xs text-zinc-700 underline-offset-2 hover:underline">
                        {editing ? 'Cancelar' : 'Editar'}
                    </button>
                )}
            </div>

            {editing ? (
                <form onSubmit={save} className="space-y-2">
                    {RECORDATORIOS_CONFIG.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                            <label className="text-xs text-zinc-600 w-28 shrink-0">{label}</label>
                            <input type="date" className="flex-1 border-gray-300 rounded-lg text-xs py-1"
                                value={recForm.data[key]}
                                onChange={e => recForm.setData(key, e.target.value)} />
                            {recForm.data[key] && (
                                <button type="button" onClick={() => recForm.setData(key, '')}
                                    className="text-zinc-400 hover:text-red-500 text-xs">✕</button>
                            )}
                        </div>
                    ))}
                    <button type="submit" disabled={recForm.processing}
                        className="w-full mt-1 bg-zinc-900 text-white text-xs py-1.5 rounded-lg font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40">
                        {recForm.processing ? 'Guardando...' : 'Guardar recordatorios'}
                    </button>
                </form>
            ) : !hasAny && maxDays === null ? (
                <p className="text-xs text-zinc-400 text-center py-2">Sin recordatorios configurados.</p>
            ) : (
                <div className="space-y-2">
                    {visibleConfigs.map(({ key, label }) => {
                        const dateStr = pet[key];
                        if (!dateStr) return null;
                        const days = daysFrom(dateStr);
                        const isOverdue = days < 0;
                        const isSoon = days >= 0 && days <= 7;
                        const isNear = days > 7 && days <= 30;

                        const bgColor = isOverdue ? 'bg-red-50 border-red-200' : isSoon ? 'bg-amber-50 border-amber-200' : isNear ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
                        const textColor = isOverdue ? 'text-red-700' : isSoon ? 'text-amber-700' : isNear ? 'text-yellow-700' : 'text-green-700';
                        const dotColor = isOverdue ? 'bg-red-500' : isSoon ? 'bg-amber-500' : isNear ? 'bg-yellow-500' : 'bg-green-500';

                        const daysLabel = isOverdue
                            ? `Hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
                            : days === 0 ? 'Hoy'
                            : `En ${days} día${days !== 1 ? 's' : ''}`;

                        return (
                            <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs ${bgColor}`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                <span className={`font-medium flex-1 ${textColor}`}>{label}</span>
                                <div className="text-right">
                                    <div className={`font-semibold ${textColor}`}>{dateStr}</div>
                                    <div className={`opacity-75 ${textColor}`}>{daysLabel}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function PetAvatar({ pet }) {
    const inputRef = useRef(null);
    const photoForm = useForm({ foto: null });
    const [compressing, setCompressing] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        setCompressing(true);
        try {
            const compressed = await compressImage(file);
            photoForm.setData('foto', compressed);
            photoForm.post(route('pets.foto.store', pet.id), {
                forceFormData: true,
                onSuccess: () => { photoForm.reset(); },
            });
        } finally {
            setCompressing(false);
        }
    }

    function deletePhoto() {
        if (!confirm('¿Eliminar la foto?')) return;
        router.delete(route('pets.foto.destroy', pet.id), { preserveScroll: true });
    }

    const url = pet.foto_url ?? null;

    return (
        <>
        <div
            className="relative group shrink-0"
            onClick={() => url && setLightboxOpen(true)}
            style={{ cursor: url ? 'zoom-in' : 'default' }}
        >
            {url ? (
                <img src={url} alt={pet.nombre}
                    className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200" />
            ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center text-3xl">
                    {tipoBadge[pet.tipo] ?? '🐾'}
                </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
                <button type="button"
                    onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="text-white text-[10px] font-medium leading-none">
                    {url ? 'Cambiar' : 'Subir'}
                </button>
                {url && (
                    <button type="button"
                        onClick={e => { e.stopPropagation(); deletePhoto(); }}
                        className="text-rose-300 text-[10px] font-medium leading-none">
                        Borrar
                    </button>
                )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        {lightboxOpen && url && (
            <Lightbox
                photos={[{ url, descripcion: pet.nombre }]}
                index={0}
                onClose={() => setLightboxOpen(false)}
                onPrev={null}
                onNext={null}
            />
        )}
        </>
    );
}

export default function PetShow({ pet, activeMembership, eventTypes, checklistItems, hotelStays, walkBookings, media = [] }) {
    const tz = useTenantTimezone();
    const [showForm, setShowForm] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const [historialOpen, setHistorialOpen] = useState(false);
    const [fotosOpen, setFotosOpen] = useState(false);

    const allEvents  = (pet.events ?? []).map(e => ({ _kind: 'event',  _fecha: e.fecha,        ...e }));
    const allHotel   = (hotelStays ?? []).map(s => ({ _kind: 'hotel',  _fecha: s.fecha_entrada, ...s }));
    const allPaseos  = (walkBookings ?? []).map(b => ({ _kind: 'paseo', _fecha: b.fecha,         ...b }));

    const timeline = [...allEvents, ...allHotel, ...allPaseos]
        .sort((a, b) => (b._fecha ?? '').localeCompare(a._fecha ?? ''));

    const filtered = timeline.filter(item => {
        if (filtro === 'todos')    return true;
        if (filtro === 'medico')   return item._kind === 'event' && MEDICO_TIPOS.includes(item.event_type?.nombre);
        if (filtro === 'hotel')    return item._kind === 'hotel';
        if (filtro === 'estetica') return item._kind === 'event' && item.event_type?.nombre === 'Estética';
        if (filtro === 'paseo')    return item._kind === 'paseo';
        return true;
    });

    const totalCount = timeline.length;

    const sexSymbol = pet.sexo === 'macho' ? { sym: '♂', cls: 'text-blue-500' }
                    : pet.sexo === 'hembra' ? { sym: '♀', cls: 'text-rose-500' }
                    : null;

    return (
        <TenantLayout title={pet.nombre}>
            <div className="mb-4 flex items-center justify-between">
                <Link href={route('owners.show', pet.owner_id)} className="text-sm text-zinc-500 hover:text-zinc-700">
                    ← {pet.owner?.nombre_completo ?? 'Dueño'}
                </Link>
                <Link href={route('pets.edit', pet.id)} className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                    Editar
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-start">

                {/* ── Info mascota ─────────────────────────── col-1 row-1 */}
                <div className="lg:col-start-1 lg:row-start-1">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="flex items-start gap-3 mb-4">
                            <PetAvatar pet={pet} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-bold text-zinc-900">{pet.nombre}</h2>
                                    {pet.nivel_agresividad && (() => {
                                        const cfg = agresividadConfig[pet.nivel_agresividad];
                                        return cfg ? (
                                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                                                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                                {cfg.label}
                                            </span>
                                        ) : null;
                                    })()}
                                    {pet.estado === 'inactivo' && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 inline-flex items-center">inactivo</span>
                                    )}
                                </div>
                                {activeMembership && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                            {activeMembership.plan?.nombre} · {formatDate(activeMembership.fecha_vencimiento, tz)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-sm space-y-1.5 text-zinc-700">
                            {pet.raza && (
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-zinc-400 text-xs w-20 shrink-0">Raza</span>
                                    <span>{pet.raza}</span>
                                </div>
                            )}
                            {pet.tamanio && (
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-zinc-400 text-xs w-20 shrink-0">Tamaño</span>
                                    <span className="capitalize">{pet.tamanio}</span>
                                </div>
                            )}
                            {pet.sexo && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-400 text-xs w-20 shrink-0">Sexo</span>
                                    {sexSymbol && (
                                        <span className={`text-lg font-bold leading-none ${sexSymbol.cls}`}>{sexSymbol.sym}</span>
                                    )}
                                    <span className="capitalize text-zinc-600">{pet.sexo}</span>
                                    {pet.esterilizado && (
                                        <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">✂ esterilizado/a</span>
                                    )}
                                </div>
                            )}
                            {pet.peso && (
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-zinc-400 text-xs w-20 shrink-0">Peso</span>
                                    <span>{pet.peso} kg</span>
                                </div>
                            )}
                            {pet.fecha_nacimiento && (
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-zinc-400 text-xs w-20 shrink-0">Nacimiento</span>
                                    <span>{formatDate(pet.fecha_nacimiento, tz)}</span>
                                    {calcEdad(pet.fecha_nacimiento) && (
                                        <span className="text-zinc-400 text-xs">({calcEdad(pet.fecha_nacimiento)})</span>
                                    )}
                                </div>
                            )}
                            {pet.num_expediente && (
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-zinc-400 text-xs w-20 shrink-0">Expediente</span>
                                    <span className="font-mono">{pet.num_expediente}</span>
                                </div>
                            )}
                        </div>

                        {(pet.alergias || pet.padecimientos || pet.obs_comportamiento) && (
                            <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                                {pet.alergias && (
                                    <div>
                                        <p className="text-xs text-zinc-400 font-medium">Alergias</p>
                                        <p className="text-zinc-700">{pet.alergias}</p>
                                    </div>
                                )}
                                {pet.padecimientos && (
                                    <div>
                                        <p className="text-xs text-zinc-400 font-medium">Padecimientos</p>
                                        <p className="text-zinc-700">{pet.padecimientos}</p>
                                    </div>
                                )}
                                {pet.obs_comportamiento && (
                                    <div>
                                        <p className="text-xs text-zinc-400 font-medium">Comportamiento</p>
                                        <p className="text-zinc-700">{pet.obs_comportamiento}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Recordatorios próximos (≤7 días) ────── col-1 row-2 */}
                <div className="lg:col-start-1 lg:row-start-2">
                    <RecordatoriosSection pet={pet} maxDays={7} />
                </div>

                {/* ── Esquema médico ───────────────────────── col-1 row-3 */}
                <div className="lg:col-start-1 lg:row-start-3">
                    <EsquemaSection events={pet.events} tz={tz} />
                </div>

                {/* ── Membresía (oculta en móvil) ─────────── col-1 row-4 */}
                <div className="hidden lg:block lg:col-start-1 lg:row-start-4">
                    {activeMembership ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Membresía activa</p>
                            <p className="font-semibold text-zinc-900">{activeMembership.plan?.nombre}</p>
                            <p className="text-xs text-zinc-500 mt-1">Vence: {formatDate(activeMembership.fecha_vencimiento, tz)}</p>
                        </div>
                    ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                            <p className="text-xs text-zinc-400 text-center">Sin membresía activa</p>
                        </div>
                    )}
                </div>

                {/* ── Historial + Fotos ────────────────────── col-2/3, rows 1-4 */}
                <div className="lg:col-start-2 lg:col-span-2 lg:row-start-1 lg:row-span-4 space-y-4">

                    {/* Historial */}
                    <div className="bg-white border border-sky-200 shadow-sm rounded-xl overflow-hidden">
                        {/* Header colapsable (móvil) / siempre visible (desktop) */}
                        <div className="flex items-center justify-between px-4 py-3.5 bg-sky-50">
                            <button type="button"
                                onClick={() => setHistorialOpen(o => !o)}
                                className="flex items-center gap-2 flex-1 text-left min-w-0 lg:cursor-default">
                                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                                <span className="font-semibold text-sky-800 text-sm">
                                    Historial ({totalCount})
                                </span>
                                <i className={`ti ti-chevron-down text-sky-400 transition-transform duration-200 lg:hidden ${historialOpen ? 'rotate-180' : ''}`} style={{ fontSize: 15 }} />
                            </button>
                            <button
                                onClick={() => { setShowForm(f => !f); if (!historialOpen) setHistorialOpen(true); }}
                                className="shrink-0 bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-sky-700 transition-colors ml-2">
                                {showForm ? 'Cancelar' : '+ Nuevo'}
                            </button>
                        </div>

                        <div className={`${historialOpen ? 'block' : 'hidden lg:block'} px-4 pb-4 pt-3 space-y-3`}>
                            {showForm && (
                                <NewEventForm
                                    petId={pet.id}
                                    eventTypes={eventTypes}
                                    onCancel={() => setShowForm(false)}
                                />
                            )}

                            <div className="flex flex-wrap gap-1.5">
                                {FILTROS.map(f => (
                                    <button key={f.key} onClick={() => setFiltro(f.key)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                            filtro === f.key
                                                ? 'bg-zinc-900 text-white border-zinc-900'
                                                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                        }`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {filtered.length === 0 && !showForm && (
                                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-8 text-center text-zinc-400 text-sm">
                                    {filtro === 'todos' ? 'Sin registros en la bitácora.' : 'Sin registros para este filtro.'}
                                </div>
                            )}

                            <div className="space-y-2">
                                {filtered.map(item => {
                                    if (item._kind === 'event') return <EventCard key={`e-${item.id}`} event={item} />;
                                    if (item._kind === 'hotel') return <HotelCard key={`h-${item.id}`} stay={item} />;
                                    if (item._kind === 'paseo') return <PaseoCard key={`p-${item.id}`} booking={item} />;
                                    return null;
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Fotos */}
                    <div className="bg-white border border-violet-200 shadow-sm rounded-xl overflow-hidden">
                        <button type="button"
                            onClick={() => setFotosOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-3.5 bg-violet-50 hover:bg-violet-100 transition-colors text-left">
                            <span className="flex items-center gap-2 font-semibold text-violet-800 text-sm">
                                <span className="w-2 h-2 rounded-full bg-violet-500" />
                                Fotos ({media.length})
                            </span>
                            <i className={`ti ti-chevron-down text-violet-400 transition-transform duration-200 ${fotosOpen ? 'rotate-180' : ''}`} style={{ fontSize: 15 }} />
                        </button>
                        {fotosOpen && (
                            <div className="px-4 pb-4 pt-3">
                                <MediaGallery media={media} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TenantLayout>
    );
}
