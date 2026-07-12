import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const TIPO_ICON = { perro: '🐕', gato: '🐈', roedor: '🐹', reptil: '🦎', otro: '🐾' };

const EVENT_COLORS = {
    Estética:       'bg-purple-50 border-purple-200 text-purple-800',
    Vacuna:         'bg-blue-50 border-blue-200 text-blue-800',
    Desparasitación:'bg-orange-50 border-orange-200 text-orange-800',
    Consulta:       'bg-teal-50 border-teal-200 text-teal-800',
};

const RECORDATORIO_CFG = [
    { key: 'recordatorio_vacuna',   label: 'Vacuna',          icon: '💉' },
    { key: 'recordatorio_despa',    label: 'Desparasitación', icon: '🐛' },
    { key: 'recordatorio_consulta', label: 'Consulta',        icon: '🩺' },
    { key: 'recordatorio_estetica', label: 'Estética',        icon: '✂️' },
];

const FILTROS = [
    { key: 'todos',    label: 'Todos' },
    { key: 'medico',   label: 'Médico' },
    { key: 'hotel',    label: 'Hotel' },
    { key: 'estetica', label: 'Estética' },
    { key: 'paseo',    label: 'Paseos' },
];

const MEDICO_TIPOS = ['Vacuna', 'Desparasitación', 'Consulta'];

function daysFrom(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function ReadonlyEventCard({ event, tz }) {
    const typeName = event.event_type?.nombre ?? 'Evento';
    const colorClass = EVENT_COLORS[typeName] ?? 'bg-zinc-50 border-zinc-200 text-zinc-800';

    return (
        <div className={`border rounded-xl p-3 text-sm ${colorClass}`}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <span className="font-semibold">{typeName}</span>
                    {event.peso && <span className="text-xs opacity-75 ml-2">{event.peso} kg</span>}
                    <div className="text-xs opacity-70 mt-0.5">
                        {event.fecha ? formatDate(event.fecha, tz, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    </div>
                </div>
            </div>

            {typeName === 'Vacuna' && event.vacuna_nombre && (
                <p className="text-xs mt-1 opacity-80">
                    {event.vacuna_nombre}
                    {event.vacuna_laboratorio && ` — ${event.vacuna_laboratorio}`}
                    {event.vacuna_lote && ` · Lote: ${event.vacuna_lote}`}
                </p>
            )}
            {typeName === 'Desparasitación' && event.despa_producto && (
                <p className="text-xs mt-1 opacity-80">{event.despa_producto}{event.despa_via && ` (${event.despa_via})`}</p>
            )}
            {typeName === 'Consulta' && event.consulta_motivo && (
                <p className="text-xs mt-1 opacity-80">Motivo: {event.consulta_motivo}</p>
            )}
            {typeName === 'Consulta' && event.consulta_diagnostico && (
                <p className="text-xs mt-1 opacity-70">{event.consulta_diagnostico}</p>
            )}
            {event.notas && <p className="text-xs mt-1 opacity-70 italic">{event.notas}</p>}
            {event.proximo_recordatorio && (
                <p className="text-xs mt-2 opacity-80">
                    Próximo: <strong>{formatDate(event.proximo_recordatorio, tz)}</strong>
                </p>
            )}
        </div>
    );
}

function EsquemaMedico({ events, tz }) {
    const vacunas = (events ?? []).filter(e => e.event_type?.nombre === 'Vacuna');
    const despas  = (events ?? []).filter(e => e.event_type?.nombre === 'Desparasitación');
    if (!vacunas.length && !despas.length) return null;

    function ProximaBadge({ dateStr }) {
        if (!dateStr) return null;
        const days = daysFrom(dateStr);
        const cls = days < 0
            ? 'text-rose-600 bg-rose-50 border-rose-200'
            : days <= 7  ? 'text-amber-600 bg-amber-50 border-amber-200'
            : days <= 30 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
            : 'text-emerald-600 bg-emerald-50 border-emerald-200';
        const label = days < 0 ? `Venció hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`;
        return (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>
                {label} · {formatDate(dateStr, tz)}
            </span>
        );
    }

    function Group({ title, icon, items, renderRow }) {
        if (!items.length) return null;
        return (
            <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{icon} {title}</p>
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
            <Group title="Vacunas" icon="💉" items={vacunas} renderRow={ev => (
                <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-zinc-800">{ev.vacuna_nombre || 'Vacuna'}</span>
                        <span className="text-zinc-400 shrink-0">{formatDate(ev.fecha, tz)}</span>
                    </div>
                    {ev.vacuna_laboratorio && (
                        <p className="text-zinc-500">{ev.vacuna_laboratorio}{ev.vacuna_lote ? ` · Lote: ${ev.vacuna_lote}` : ''}</p>
                    )}
                    <ProximaBadge dateStr={ev.proximo_recordatorio} />
                </div>
            )} />
            <Group title="Desparasitación" icon="🐛" items={despas} renderRow={ev => (
                <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-zinc-800">
                            {ev.despa_producto || 'Desparasitación'}
                            {ev.despa_via && <span className="text-zinc-400 font-normal ml-1">· {ev.despa_via}</span>}
                        </span>
                        <span className="text-zinc-400 shrink-0">{formatDate(ev.fecha, tz)}</span>
                    </div>
                    <ProximaBadge dateStr={ev.proximo_recordatorio} />
                </div>
            )} />
        </div>
    );
}

function RecordatoriosReadOnly({ pet, tz }) {
    const items = RECORDATORIO_CFG.filter(r => pet[r.key]);
    if (!items.length) return null;

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Recordatorios</h3>
            <div className="space-y-2">
                {items.map(({ key, label, icon }) => {
                    const dateStr = pet[key];
                    const days = daysFrom(dateStr);
                    const isOverdue = days < 0;
                    const isSoon = days >= 0 && days <= 7;
                    const isNear = days > 7 && days <= 30;
                    const bg = isOverdue ? 'bg-rose-50 border-rose-200' : isSoon ? 'bg-amber-50 border-amber-200' : isNear ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200';
                    const text = isOverdue ? 'text-rose-700' : isSoon ? 'text-amber-700' : isNear ? 'text-yellow-700' : 'text-emerald-700';
                    const dot  = isOverdue ? 'bg-rose-500' : isSoon ? 'bg-amber-500' : isNear ? 'bg-yellow-500' : 'bg-emerald-500';
                    const daysLabel = isOverdue ? `Hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`;
                    return (
                        <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs ${bg}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                            <span className={`font-medium flex-1 ${text}`}>{icon} {label}</span>
                            <div className="text-right">
                                <div className={`font-semibold ${text}`}>{formatDate(dateStr, tz)}</div>
                                <div className={`opacity-75 ${text}`}>{daysLabel}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function PortalPetHistory({ tenant, owner, pet, hotelStays, walkBookings, activeMembership }) {
    const tz = useTenantTimezone();
    const [filtro, setFiltro] = useState('todos');

    const allEvents  = (pet.events ?? []).map(e => ({ _kind: 'event', _fecha: e.fecha, ...e }));
    const allHotel   = (hotelStays ?? []).map(s => ({ _kind: 'hotel', _fecha: s.fecha_entrada, ...s }));
    const allPaseos  = (walkBookings ?? []).map(b => ({ _kind: 'paseo', _fecha: b.fecha, ...b }));

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

    const servicioColor = {
        guarderia: 'bg-blue-50 text-blue-700',
        hotel:     'bg-sky-50 text-sky-700',
        estetica:  'bg-pink-50 text-pink-700',
        paseo:     'bg-emerald-50 text-emerald-700',
    };
    const servicioLabel = { guarderia: 'Guardería', hotel: 'Hotel', estetica: 'Estética', paseo: 'Paseo' };

    return (
        <PortalLayout tenant={tenant} owner={owner} current="home">
            <div className="mb-4">
                <Link href={route('portal.dashboard', tenant.slug)} className="text-sm text-zinc-500 hover:text-zinc-700">
                    ← Inicio
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Columna izquierda: info */}
                <div className="space-y-3">
                    {/* Ficha */}
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="flex flex-col items-center gap-3 mb-4">
                            {pet.foto_url ? (
                                <img src={pet.foto_url} alt={pet.nombre}
                                    className="w-20 h-20 rounded-full object-cover border border-zinc-100" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-4xl">
                                    {TIPO_ICON[pet.tipo] ?? '🐾'}
                                </div>
                            )}
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-zinc-900">{pet.nombre}</h2>
                                {pet.estado === 'inactivo' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">inactivo</span>
                                )}
                            </div>
                        </div>

                        <div className="text-sm space-y-1.5 text-zinc-600">
                            {pet.raza && <div><span className="text-zinc-400">Raza:</span> {pet.raza}</div>}
                            {pet.tamanio && <div><span className="text-zinc-400">Tamaño:</span> {pet.tamanio}</div>}
                            {pet.sexo && <div><span className="text-zinc-400">Sexo:</span> {pet.sexo}{pet.esterilizado ? ' · esterilizado/a' : ''}</div>}
                            {pet.peso && <div><span className="text-zinc-400">Peso:</span> {pet.peso} kg</div>}
                            {pet.fecha_nacimiento && <div><span className="text-zinc-400">Nacimiento:</span> {formatDate(pet.fecha_nacimiento, tz)}</div>}
                            {pet.num_expediente && <div><span className="text-zinc-400">Expediente:</span> <span className="font-mono text-xs">{pet.num_expediente}</span></div>}
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
                    <EsquemaMedico events={pet.events} tz={tz} />

                    {/* Recordatorios */}
                    <RecordatoriosReadOnly pet={pet} tz={tz} />

                    {/* Membresía activa */}
                    {activeMembership ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Membresía activa</p>
                            <p className="font-semibold text-zinc-900">{activeMembership.plan?.nombre}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Vence: {formatDate(activeMembership.fecha_vencimiento, tz)}
                            </p>
                            {activeMembership.credits?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {activeMembership.credits.map(c => (
                                        <span key={c.servicio_tipo}
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                c.saldo_actual <= 2
                                                    ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                                                    : servicioColor[c.servicio_tipo] ?? 'bg-zinc-100 text-zinc-600'
                                            }`}>
                                            {servicioLabel[c.servicio_tipo] ?? c.servicio_tipo} {c.saldo_actual}/{c.saldo_inicial}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                            <p className="text-xs text-zinc-400 text-center">Sin membresía activa</p>
                        </div>
                    )}
                </div>

                {/* Columna derecha: historial */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-700">
                            Historial ({timeline.length})
                        </h3>
                    </div>

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

                    {filtered.length === 0 && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
                            {filtro === 'todos' ? 'Sin registros en el historial.' : 'Sin registros para este filtro.'}
                        </div>
                    )}

                    <div className="space-y-2">
                        {filtered.map(item => {
                            if (item._kind === 'event') {
                                return <ReadonlyEventCard key={`e-${item.id}`} event={item} tz={tz} />;
                            }
                            if (item._kind === 'hotel') {
                                const tipoLabel = item.tipo === 'hotel' ? 'Hotel' : 'Guardería';
                                const colorClass = item.tipo === 'hotel'
                                    ? 'bg-sky-50 border-sky-200 text-sky-800'
                                    : 'bg-cyan-50 border-cyan-200 text-cyan-800';
                                return (
                                    <div key={`h-${item.id}`} className={`border rounded-xl p-3 text-sm ${colorClass}`}>
                                        <div className="font-semibold">{tipoLabel}</div>
                                        <div className="text-xs opacity-75 mt-0.5">
                                            Entrada: {formatDate(item.fecha_entrada, tz)}
                                            {item.fecha_salida && <> · Salida: {formatDate(item.fecha_salida, tz)}</>}
                                        </div>
                                        {item.notas && <p className="text-xs mt-1 opacity-70 italic">{item.notas}</p>}
                                    </div>
                                );
                            }
                            if (item._kind === 'paseo') {
                                return (
                                    <div key={`p-${item.id}`} className="border rounded-xl p-3 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold">Paseo</div>
                                                <div className="text-xs opacity-75 mt-0.5">
                                                    {item.fecha ? formatDate(item.fecha, tz) : '—'}
                                                    {item.hora_inicio && <> · {String(item.hora_inicio).slice(0, 5)}</>}
                                                </div>
                                            </div>
                                            <span className="text-xs opacity-70 capitalize">{item.estado}</span>
                                        </div>
                                        {item.notas && <p className="text-xs mt-1 opacity-70 italic">{item.notas}</p>}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
}
