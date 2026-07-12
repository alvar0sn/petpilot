import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { dateKeyInTimezone, useTenantTimezone } from '@/lib/datetime';

// --- Constants ---
const MOBILE_DAY  = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];
const DESKTOP_DAY = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];
const tipoLabel   = { grupal: 'Grupal', privado: 'Privado' };
const estadoLabel = { abierto: 'Abierto', en_curso: 'En curso', completado: 'Completado', cancelado: 'Cancelado' };
const DAY_NAMES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const calendarBg = {
    grupal:  'bg-slate-700',
    privado: 'bg-fuchsia-400',
};
const mobileBorderBg = {
    grupal:  'bg-indigo-600',
    privado: 'bg-fuchsia-400',
};

// --- Date helpers ---
function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

function buildWeekDays(weekStart) {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function dayOfWeek(dateStr) {
    return new Date(dateStr + 'T12:00:00').getDay();
}

function dayNum(dateStr) {
    return new Date(dateStr + 'T12:00:00').getDate();
}

function formatWeekRange(weekDays) {
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `${fmt(weekDays[0])} — ${fmt(weekDays[6])}`;
}

// --- CreateSlotModal ---
function CreateSlotModal({ walkers, onClose }) {
    const tz = useTenantTimezone();
    const today = dateKeyInTimezone(new Date(), tz);
    const [recurrent, setRecurrent] = useState(false);

    const form = useForm({
        tipo: 'grupal',
        fecha: today,
        recurrent: false,
        recurrence_type: 'weekly',
        recurrence_days: [],
        fecha_inicio: today,
        fecha_fin: '',
        weeks_ahead: '8',
        hora_inicio: '',
        hora_fin: '',
        cupo_maximo: '',
        walker_id: '',
        notas: '',
    });

    function toggleDay(d) {
        const days = form.data.recurrence_days;
        const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort();
        form.setData('recurrence_days', next);
    }

    function submit() {
        form.transform(data => ({ ...data, recurrent }));
        form.post(route('walks.store'), { onSuccess: onClose });
    }

    const canSubmit = recurrent
        ? (form.data.fecha_inicio && (form.data.recurrence_type === 'daily' || form.data.recurrence_days.length > 0))
        : !!form.data.fecha;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-md space-y-3 max-h-[92vh] overflow-y-auto">
                <h3 className="font-semibold text-zinc-800 text-sm">Crear slot de paseo</h3>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                    <div className="flex gap-2">
                        {['grupal', 'privado'].map(t => (
                            <button key={t} onClick={() => form.setData('tipo', t)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.data.tipo === t ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                                {tipoLabel[t]}
                            </button>
                        ))}
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded text-zinc-900"
                        checked={recurrent} onChange={e => setRecurrent(e.target.checked)} />
                    <span className="text-sm text-zinc-700">Recurrente (se repite)</span>
                </label>

                {!recurrent ? (
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha *</label>
                        <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.fecha} onChange={e => form.setData('fecha', e.target.value)} />
                        {form.errors.fecha && <p className="text-red-500 text-xs mt-0.5">{form.errors.fecha}</p>}
                    </div>
                ) : (
                    <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 space-y-3">
                        <p className="text-xs font-medium text-zinc-700">Configurar recurrencia</p>

                        <div className="flex gap-2">
                            {['weekly', 'daily'].map(t => (
                                <button key={t} onClick={() => form.setData('recurrence_type', t)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.data.recurrence_type === t ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 bg-white'}`}>
                                    {t === 'weekly' ? 'Semanal' : 'Diario'}
                                </button>
                            ))}
                        </div>

                        {form.data.recurrence_type === 'weekly' && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Días de la semana *</label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {DAY_NAMES.map((name, idx) => (
                                        <button key={idx} onClick={() => toggleDay(idx)}
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.data.recurrence_days.includes(idx) ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 bg-white text-zinc-600'}`}>
                                            {name}
                                        </button>
                                    ))}
                                </div>
                                {form.errors.recurrence_days && <p className="text-red-500 text-xs mt-0.5">{form.errors.recurrence_days}</p>}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha inicio *</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-xs py-1.5 bg-white"
                                    value={form.data.fecha_inicio} onChange={e => form.setData('fecha_inicio', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha fin</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-xs py-1.5 bg-white"
                                    value={form.data.fecha_fin} onChange={e => form.setData('fecha_fin', e.target.value)} />
                            </div>
                        </div>

                        {!form.data.fecha_fin && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">O generar para las próximas...</label>
                                <select className="w-full border-gray-300 rounded-lg text-xs py-1.5 bg-white"
                                    value={form.data.weeks_ahead} onChange={e => form.setData('weeks_ahead', e.target.value)}>
                                    {[2, 4, 6, 8, 12, 16, 26, 52].map(w => (
                                        <option key={w} value={w}>{w} semanas</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Hora inicio</label>
                        <input type="time" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.hora_inicio} onChange={e => form.setData('hora_inicio', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Hora fin</label>
                        <input type="time" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.hora_fin} onChange={e => form.setData('hora_fin', e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                            {form.data.tipo === 'grupal' ? 'Cupo máximo' : 'Slots privados'}
                        </label>
                        <input type="number" min="1" max="100" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            placeholder="Sin límite"
                            value={form.data.cupo_maximo} onChange={e => form.setData('cupo_maximo', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Paseador</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.walker_id} onChange={e => form.setData('walker_id', e.target.value)}>
                            <option value="">Sin asignar</option>
                            {walkers.map(w => (
                                <option key={w.id} value={w.id}>{w.nombre} {w.apellido}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
                    <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2}
                        value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">Cancelar</button>
                    <button onClick={submit} disabled={!canSubmit || form.processing}
                        className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40">
                        {form.processing ? 'Creando...' : recurrent ? 'Crear serie' : 'Crear slot'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Desktop calendar card ---
function CalendarCard({ slot }) {
    const estado = slot.estado;
    const isActive = estado === 'abierto' || estado === 'en_curso';
    const bg = isActive ? (calendarBg[slot.tipo] ?? 'bg-zinc-500') : 'bg-zinc-300';
    const libre = slot.cupo_maximo ? slot.cupo_maximo - slot.cupos_ocupados : null;

    return (
        <Link href={route('walks.show', slot.id)}>
            <div className={`rounded-lg p-2.5 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity ${bg}`}>
                <div className="font-semibold leading-tight truncate">{tipoLabel[slot.tipo]}</div>
                {slot.hora_inicio && <div className="mt-0.5 opacity-90">{slot.hora_inicio.slice(0, 5)}</div>}
                {slot.walker && <div className="opacity-75 mt-0.5 truncate">{slot.walker}</div>}
                <div className="mt-1 font-medium">{slot.cupos_ocupados}/{slot.cupo_maximo ?? '∞'}</div>
                {!isActive && (
                    <div className="mt-1 opacity-80 text-[10px] uppercase tracking-wide">{estadoLabel[estado]}</div>
                )}
                {slot.solicitudes_pendientes > 0 && (
                    <span className="mt-1 inline-block bg-amber-400 text-amber-900 rounded px-1 font-medium">
                        {slot.solicitudes_pendientes} pend.
                    </span>
                )}
            </div>
        </Link>
    );
}

// --- Mobile list item ---
function MobileSlotItem({ slot }) {
    const libre = slot.cupo_maximo != null ? slot.cupo_maximo - slot.cupos_ocupados : null;

    return (
        <Link href={route('walks.show', slot.id)}>
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl flex items-stretch overflow-hidden">
                <div className={`w-1.5 shrink-0 ${mobileBorderBg[slot.tipo] ?? 'bg-zinc-400'}`} />
                <div className="flex-1 flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-semibold text-zinc-800">
                                {slot.hora_inicio?.slice(0, 5) ?? '--:--'}
                            </span>
                            <span className="font-medium text-zinc-800 text-sm">{tipoLabel[slot.tipo]}</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                            {[slot.walker].filter(Boolean).join(' · ')}
                            {slot.estado !== 'abierto' && (
                                <span className="ml-1 text-amber-600">· {estadoLabel[slot.estado]}</span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-zinc-700">
                            {slot.cupos_ocupados}/{slot.cupo_maximo ?? '∞'}
                        </div>
                        {libre !== null && (
                            <div className="text-xs text-zinc-400">{libre} libre{libre !== 1 ? 's' : ''}</div>
                        )}
                        {slot.solicitudes_pendientes > 0 && (
                            <div className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 mt-0.5">
                                {slot.solicitudes_pendientes} pend.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

// --- Solicitudes tab ---
function SolicitudesTab({ bookings, onApprove, onCancel }) {
    const [confirming, setConfirming] = useState(null);

    if (bookings.length === 0) {
        return (
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-12 text-center">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-zinc-500 text-sm font-medium">Sin solicitudes pendientes</p>
                <p className="text-zinc-400 text-xs mt-0.5">Todas las solicitudes han sido atendidas</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {bookings.map(b => {
                const fechaLabel = b.slot_fecha
                    ? new Date(b.slot_fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
                    : null;

                return (
                    <div key={b.id} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-zinc-800 text-sm">{b.owner ?? '—'}</span>
                                    <span className="text-zinc-300">·</span>
                                    <span className="text-zinc-600 text-sm">{b.pet ?? '—'}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1 capitalize">
                                    {fechaLabel}
                                    {b.slot_hora && <span> · {b.slot_hora.slice(0, 5)}</span>}
                                    {b.slot_tipo && <span> · {tipoLabel[b.slot_tipo]}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {b.cobro_membresia && (
                                        <span className="inline-flex items-center text-[11px] text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                                            Usar crédito membresía
                                        </span>
                                    )}
                                    {b.slot_id && (
                                        <Link href={route('walks.show', b.slot_id)}
                                            className="text-[11px] text-zinc-400 hover:text-zinc-600 underline-offset-2 hover:underline">
                                            Ver paseo →
                                        </Link>
                                    )}
                                </div>
                                {b.notas && (
                                    <p className="text-xs text-zinc-400 italic mt-1.5">"{b.notas}"</p>
                                )}
                            </div>

                            <div className="shrink-0">
                                {confirming === b.id ? (
                                    <div className="flex flex-col gap-1.5 items-end">
                                        <span className="text-xs text-zinc-500">¿Rechazar?</span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setConfirming(null)}
                                                className="px-2.5 py-1.5 rounded-lg text-xs border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                                                No
                                            </button>
                                            <button onClick={() => { setConfirming(null); onCancel(b.id); }}
                                                className="px-2.5 py-1.5 rounded-lg text-xs bg-rose-600 text-white hover:bg-rose-700 transition-colors">
                                                Sí, rechazar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setConfirming(b.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                                            Rechazar
                                        </button>
                                        <button onClick={() => onApprove(b.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                                            Aprobar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// --- Main page ---
export default function WalksIndex({ slots, walkers, filters, pending_bookings }) {
    const tz = useTenantTimezone();
    const [showCreate, setShowCreate] = useState(false);
    const today = dateKeyInTimezone(new Date(), tz);
    const weekDays = buildWeekDays(filters.week_start);
    const isCurrentWeek = weekDays.includes(today);
    const defaultDay = isCurrentWeek ? today : weekDays[0];
    const [selectedDay, setSelectedDay] = useState(null);
    const activeMobileDay = selectedDay && weekDays.includes(selectedDay) ? selectedDay : defaultDay;

    const tab = filters.tab || 'calendario';

    // Group slots by date
    const slotsByDay = Object.fromEntries(weekDays.map(d => [d, []]));
    slots.forEach(s => { if (s.fecha in slotsByDay) slotsByDay[s.fecha].push(s); });

    function goWeek(delta) {
        router.get(route('walks.index'), {
            week_start: addDays(filters.week_start, delta * 7),
            ...(filters.tipo ? { tipo: filters.tipo } : {}),
            ...(filters.estado ? { estado: filters.estado } : {}),
            tab,
        }, { preserveState: false, replace: true });
    }

    function goThisWeek() {
        router.get(route('walks.index'), {
            ...(filters.tipo ? { tipo: filters.tipo } : {}),
            ...(filters.estado ? { estado: filters.estado } : {}),
            tab,
        }, { preserveState: false, replace: true });
    }

    function switchTab(t) {
        router.get(route('walks.index'), {
            week_start: filters.week_start,
            ...(filters.tipo ? { tipo: filters.tipo } : {}),
            ...(filters.estado ? { estado: filters.estado } : {}),
            tab: t,
        }, { preserveState: true, replace: true });
    }

    function approveBooking(id) {
        router.post(route('walks.bookings.approve', id));
    }

    function cancelBooking(id) {
        router.post(route('walks.bookings.cancel', id));
    }

    return (
        <TenantLayout title="Paseos">
            {showCreate && <CreateSlotModal walkers={walkers} onClose={() => setShowCreate(false)} />}

            {/* Header */}
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-zinc-800">Paseos</h2>
                {tab === 'calendario' && (
                    <button onClick={() => setShowCreate(true)}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                        + Crear slot
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-zinc-100 p-1 rounded-lg w-fit">
                <button onClick={() => switchTab('calendario')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'calendario' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                    Calendario
                </button>
                <button onClick={() => switchTab('solicitudes')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'solicitudes' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                    Solicitudes
                    {pending_bookings.length > 0 && (
                        <span className={`text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none ${tab === 'solicitudes' ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {pending_bookings.length > 9 ? '9+' : pending_bookings.length}
                        </span>
                    )}
                </button>
            </div>

            {tab === 'calendario' && (
                <>
                    {/* Week navigator */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button onClick={() => goWeek(-1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 text-xl font-light transition-colors">
                            ‹
                        </button>
                        <div className="text-center min-w-[160px]">
                            <div className="font-semibold text-zinc-800">{formatWeekRange(weekDays)}</div>
                            {isCurrentWeek
                                ? <div className="text-xs text-zinc-900 font-medium mt-0.5">Esta semana</div>
                                : <button onClick={goThisWeek} className="text-xs text-zinc-500 hover:text-zinc-700 mt-0.5">
                                    Ir a esta semana
                                  </button>
                            }
                        </div>
                        <button onClick={() => goWeek(1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 text-xl font-light transition-colors">
                            ›
                        </button>
                    </div>

                    {/* Desktop: 7-column week grid */}
                    <div className="hidden sm:block">
                        <div className="grid grid-cols-7 gap-2 mb-3">
                            {weekDays.map(day => {
                                const dow = dayOfWeek(day);
                                const isToday = day === today;
                                return (
                                    <div key={day} className="text-center">
                                        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                            {DESKTOP_DAY[dow]}
                                        </div>
                                        <div className={`text-xl font-bold mt-0.5 ${isToday ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                            {dayNum(day)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {weekDays.map(day => (
                                <div key={day} className="space-y-1.5 min-h-[3rem]">
                                    {slotsByDay[day].map(slot => <CalendarCard key={slot.id} slot={slot} />)}
                                    {slotsByDay[day].length === 0 && (
                                        <div className="border-t border-dashed border-zinc-200" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mobile: day pills + list */}
                    <div className="sm:hidden">
                        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                            {weekDays.map(day => {
                                const dow = dayOfWeek(day);
                                const isActive = day === activeMobileDay;
                                const isToday = day === today;
                                const hasSlots = slotsByDay[day].length > 0;
                                return (
                                    <button key={day} onClick={() => setSelectedDay(day)}
                                        className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-colors ${
                                            isActive
                                                ? 'bg-zinc-900 text-white border-zinc-900'
                                                : 'bg-white text-zinc-600 border-zinc-200'
                                        }`}>
                                        <span className="text-[11px] font-semibold">{MOBILE_DAY[dow]}</span>
                                        <span className={`text-lg font-bold leading-tight ${isActive ? 'text-white' : isToday ? 'text-zinc-900' : 'text-zinc-800'}`}>
                                            {dayNum(day)}
                                        </span>
                                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                            hasSlots
                                                ? isActive ? 'bg-white' : 'bg-zinc-400'
                                                : 'invisible'
                                        }`} />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-3">
                            {slotsByDay[activeMobileDay].map(slot => (
                                <MobileSlotItem key={slot.id} slot={slot} />
                            ))}
                            {slotsByDay[activeMobileDay].length === 0 && (
                                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
                                    Sin paseos este día
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {tab === 'solicitudes' && (
                <SolicitudesTab
                    bookings={pending_bookings}
                    onApprove={approveBooking}
                    onCancel={cancelBooking}
                />
            )}
        </TenantLayout>
    );
}
