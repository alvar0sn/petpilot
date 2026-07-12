import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { dateKeyInTimezone, formatDate, useTenantTimezone } from '@/lib/datetime';

const agresividadBadge = {
    tranquilo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    precaucion: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    agresivo: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
};

const tipoBadge = { perro: '🐶', gato: '🐱', roedor: '🐭', reptil: '🦎', otro: '🐾' };

const eventColors = {
    Estética: 'bg-purple-100 border-purple-300 text-purple-800',
    Vacuna: 'bg-blue-100 border-blue-300 text-blue-800',
    Desparasitación: 'bg-orange-100 border-orange-300 text-orange-800',
    Consulta: 'bg-teal-100 border-teal-300 text-teal-800',
};

function NewEventForm({ petId, eventTypes, checklistItems, onCancel }) {
    const tz = useTenantTimezone();
    const { data, setData, post, processing, errors, reset } = useForm({
        event_type_id: eventTypes[0]?.id ?? '',
        fecha: dateKeyInTimezone(new Date(), tz),
        peso: '',
        notas: '',
        // Estética
        est_verrugas: false,
        est_pulgas: false,
        est_secreciones: false,
        est_lesiones: false,
        est_alergias: false,
        est_manto: '',
        checklist_items: [],
        // Vacuna
        vacuna_nombre: '',
        vacuna_lote: '',
        vacuna_laboratorio: '',
        // Desparasitación
        despa_producto: '',
        despa_via: '',
        // Shared próxima date (Vacuna & Despa)
        proximo_recordatorio: '',
        // Consulta
        consulta_temperatura: '',
        consulta_motivo: '',
        consulta_diagnostico: '',
        consulta_medicamentos: '',
        consulta_proxima_cita: '',
    });

    const selectedType = eventTypes.find(t => t.id == data.event_type_id);
    const typeName = selectedType?.nombre;

    function submit(e) {
        e.preventDefault();
        post(route('events.store', petId), {
            onSuccess: () => { reset(); onCancel(); },
        });
    }

    function toggleChecklist(id) {
        setData('checklist_items',
            data.checklist_items.includes(id)
                ? data.checklist_items.filter(x => x !== id)
                : [...data.checklist_items, id]
        );
    }

    return (
        <form onSubmit={submit} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-zinc-800 text-sm">Nuevo evento</h3>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.event_type_id} onChange={e => setData('event_type_id', e.target.value)}>
                        {eventTypes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
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

            {/* Estética */}
            {typeName === 'Estética' && (
                <div className="space-y-3 border-t pt-3">
                    <p className="text-xs font-semibold text-zinc-400">Hallazgos</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {['est_verrugas', 'est_pulgas', 'est_secreciones', 'est_lesiones', 'est_alergias'].map(field => (
                            <label key={field} className="flex gap-2 items-center">
                                <input type="checkbox" checked={data[field]} onChange={e => setData(field, e.target.checked)} className="rounded" />
                                {field.replace('est_', '').charAt(0).toUpperCase() + field.replace('est_', '').slice(1)}
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Estado del manto</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={data.est_manto} onChange={e => setData('est_manto', e.target.value)} placeholder="bueno, regular, malo..." />
                    </div>
                    {checklistItems.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-zinc-600 mb-2">Checklist de servicio</p>
                            <div className="grid grid-cols-2 gap-1">
                                {checklistItems.map(item => (
                                    <label key={item.id} className="flex gap-2 items-center text-sm">
                                        <input type="checkbox" checked={data.checklist_items.includes(item.id)} onChange={() => toggleChecklist(item.id)} className="rounded" />
                                        {item.nombre}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Vacuna */}
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

            {/* Desparasitación */}
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

            {/* Consulta */}
            {typeName === 'Consulta' && (
                <div className="space-y-3 border-t pt-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Temperatura (°C)</label>
                            <input type="number" step="0.1" className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_temperatura} onChange={e => setData('consulta_temperatura', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Próxima cita</label>
                            <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_proxima_cita} onChange={e => setData('consulta_proxima_cita', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Motivo</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_motivo} onChange={e => setData('consulta_motivo', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Diagnóstico</label>
                            <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_diagnostico} onChange={e => setData('consulta_diagnostico', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Medicamentos</label>
                            <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_medicamentos} onChange={e => setData('consulta_medicamentos', e.target.value)} />
                        </div>
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
                    <Link href={route('events.edit', event.id)} className="text-xs underline opacity-70 hover:opacity-100">editar</Link>
                    <span className="opacity-40">·</span>
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
                    Ver ficha completa (recepción + salida) →
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

function EsquemaSection({ events, tz }) {
    const vacunas = (events ?? []).filter(e => e.event_type?.nombre === 'Vacuna');
    const despas  = (events ?? []).filter(e => e.event_type?.nombre === 'Desparasitación');

    if (!vacunas.length && !despas.length) return null;

    function ProximaBadge({ dateStr }) {
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

    function SubSection({ title, icon, items, renderRow }) {
        if (!items.length) return null;
        return (
            <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                    {icon} {title}
                </p>
                <div className="space-y-2">
                    {items.slice(0, 5).map((ev, i) => (
                        <div key={ev.id} className={`text-xs rounded-lg px-3 py-2 ${i === 0 ? 'bg-zinc-50 border border-zinc-200' : 'pl-3'}`}>
                            {renderRow(ev)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Esquema médico</h3>

            <SubSection title="Vacunas" icon="💉" items={vacunas} renderRow={ev => (
                <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-zinc-800">
                            {ev.vacuna_nombre || 'Vacuna'}
                        </span>
                        <span className="text-zinc-400 shrink-0">
                            {formatDate(ev.fecha, tz)}
                        </span>
                    </div>
                    {ev.vacuna_laboratorio && (
                        <p className="text-zinc-500">{ev.vacuna_laboratorio}{ev.vacuna_lote ? ` · Lote: ${ev.vacuna_lote}` : ''}</p>
                    )}
                    <ProximaBadge dateStr={ev.proximo_recordatorio} />
                </div>
            )} />

            <SubSection title="Desparasitación" icon="🐛" items={despas} renderRow={ev => (
                <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-zinc-800">
                            {ev.despa_producto || 'Desparasitación'}
                            {ev.despa_via && <span className="text-zinc-400 font-normal ml-1">· {ev.despa_via}</span>}
                        </span>
                        <span className="text-zinc-400 shrink-0">
                            {formatDate(ev.fecha, tz)}
                        </span>
                    </div>
                    <ProximaBadge dateStr={ev.proximo_recordatorio} />
                </div>
            )} />
        </div>
    );
}

const FILTROS = [
    { key: 'todos',   label: 'Todos' },
    { key: 'medico',  label: 'Médico' },
    { key: 'hotel',   label: 'Hotel / Guardería' },
    { key: 'estetica', label: 'Estética' },
    { key: 'paseo',   label: 'Paseos' },
];

const MEDICO_TIPOS = ['Vacuna', 'Desparasitación', 'Consulta'];

const RECORDATORIOS_CONFIG = [
    { key: 'recordatorio_vacuna',   label: 'Vacuna',           color: 'blue' },
    { key: 'recordatorio_despa',    label: 'Desparasitación',  color: 'orange' },
    { key: 'recordatorio_consulta', label: 'Consulta',         color: 'teal' },
    { key: 'recordatorio_estetica', label: 'Estética',         color: 'purple' },
];

function daysFrom(dateStr) {
    if (!dateStr) return null;
    const ymd = String(dateStr).slice(0, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(ymd + 'T00:00:00');
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function RecordatoriosSection({ pet }) {
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

    const hasAny = RECORDATORIOS_CONFIG.some(r => pet[r.key]);

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Recordatorios</h3>
                <button onClick={() => setEditing(e => !e)} className="text-xs text-zinc-700 underline-offset-2 hover:underline">
                    {editing ? 'Cancelar' : 'Editar'}
                </button>
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
            ) : !hasAny ? (
                <p className="text-xs text-zinc-400 text-center py-2">Sin recordatorios configurados.</p>
            ) : (
                <div className="space-y-2">
                    {RECORDATORIOS_CONFIG.map(({ key, label, color }) => {
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

export default function PetShow({ pet, activeMembership, eventTypes, checklistItems, hotelStays, walkBookings }) {
    const tz = useTenantTimezone();
    const [showForm, setShowForm] = useState(false);
    const [filtro, setFiltro] = useState('todos');

    // Build unified timeline
    const allEvents  = (pet.events ?? []).map(e => ({ _kind: 'event',  _fecha: e.fecha,                   ...e }));
    const allHotel   = (hotelStays ?? []).map(s => ({ _kind: 'hotel',  _fecha: s.fecha_entrada,            ...s }));
    const allPaseos  = (walkBookings ?? []).map(b => ({ _kind: 'paseo', _fecha: b.fecha,                   ...b }));

    const timeline = [...allEvents, ...allHotel, ...allPaseos]
        .sort((a, b) => (b._fecha ?? '').localeCompare(a._fecha ?? ''));

    const filtered = timeline.filter(item => {
        if (filtro === 'todos') return true;
        if (filtro === 'medico')   return item._kind === 'event' && MEDICO_TIPOS.includes(item.event_type?.nombre);
        if (filtro === 'hotel')    return item._kind === 'hotel';
        if (filtro === 'estetica') return item._kind === 'event' && item.event_type?.nombre === 'Estética';
        if (filtro === 'paseo')    return item._kind === 'paseo';
        return true;
    });

    const totalCount = timeline.length;

    return (
        <TenantLayout title={pet.nombre}>
            <div className="mb-4 flex items-center justify-between">
                <Link href={route('owners.show', pet.owner_id)} className="text-sm text-zinc-500 hover:text-zinc-700">
                    ← {pet.owner?.nombre_completo ?? 'Dueño'}
                </Link>
                <div className="flex gap-2">
                    <Link href={route('pets.edit', pet.id)} className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                        Editar
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Info mascota */}
                <div className="space-y-3">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="flex items-start gap-3 mb-4">
                            <span className="text-4xl">{tipoBadge[pet.tipo] ?? '🐾'}</span>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900">{pet.nombre}</h2>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${agresividadBadge[pet.nivel_agresividad]}`}>
                                    {pet.nivel_agresividad}
                                </span>
                                {pet.estado === 'inactivo' && (
                                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 inline-flex items-center">inactivo</span>
                                )}
                            </div>
                        </div>

                        <div className="text-sm space-y-1.5 text-zinc-600">
                            {pet.raza && <div><span className="text-zinc-400">Raza:</span> {pet.raza}</div>}
                            {pet.tamanio && <div><span className="text-zinc-400">Tamaño:</span> {pet.tamanio}</div>}
                            {pet.sexo && <div><span className="text-zinc-400">Sexo:</span> {pet.sexo}{pet.esterilizado ? ' · esterilizado/a' : ''}</div>}
                            {pet.peso && <div><span className="text-zinc-400">Peso:</span> {pet.peso} kg</div>}
                            {pet.fecha_nacimiento && <div><span className="text-zinc-400">Nacimiento:</span> {formatDate(pet.fecha_nacimiento, tz)}</div>}
                            {pet.num_expediente && <div><span className="text-zinc-400">Expediente:</span> <span className="font-mono">{pet.num_expediente}</span></div>}
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

                    {/* Esquema médico */}
                    <EsquemaSection events={pet.events} tz={tz} />

                    {/* Recordatorios */}
                    <RecordatoriosSection pet={pet} />

                    {/* Membresía activa */}
                    {activeMembership ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Membresía activa</p>
                            <p className="font-semibold text-zinc-900">{activeMembership.plan?.nombre}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Vence: {formatDate(activeMembership.fecha_vencimiento, tz)}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                            <p className="text-xs text-zinc-400 text-center">Sin membresía activa</p>
                        </div>
                    )}
                </div>

                {/* Bitácora */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
                            Historial ({totalCount})
                        </h3>
                        <button
                            onClick={() => setShowForm(f => !f)}
                            className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 text-sm font-medium transition-colors"
                        >
                            {showForm ? 'Cancelar' : '+ Nuevo evento'}
                        </button>
                    </div>

                    {showForm && (
                        <NewEventForm
                            petId={pet.id}
                            eventTypes={eventTypes}
                            checklistItems={checklistItems}
                            onCancel={() => setShowForm(false)}
                        />
                    )}

                    {/* Filtros */}
                    <div className="flex flex-wrap gap-1.5">
                        {FILTROS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFiltro(f.key)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                    filtro === f.key
                                        ? 'bg-zinc-900 text-white border-zinc-900'
                                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 && !showForm && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
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
        </TenantLayout>
    );
}
