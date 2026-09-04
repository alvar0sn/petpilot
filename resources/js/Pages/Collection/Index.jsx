import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { dateKeyInTimezone, useTenantTimezone } from '@/lib/datetime';

// --- Constants ---
const MOBILE_DAY  = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];
const DESKTOP_DAY = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];
const estadoLabel = { abierto: 'Abierto', en_curso: 'En curso', completado: 'Completado', cancelado: 'Cancelado' };

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
function CreateSlotModal({ recolectores, onClose }) {
    const tz = useTenantTimezone();
    const today = dateKeyInTimezone(new Date(), tz);

    const form = useForm({
        fecha: today,
        hora_inicio: '',
        hora_fin: '',
        cupo_maximo: '',
        recolector_id: '',
        notas: '',
    });

    function submit() {
        form.post(route('collection.store'), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-md space-y-3 max-h-[92vh] overflow-y-auto">
                <h3 className="font-semibold text-zinc-800 text-sm">Crear ruta de recolección</h3>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha *</label>
                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                        value={form.data.fecha} onChange={e => form.setData('fecha', e.target.value)} />
                    {form.errors.fecha && <p className="text-red-500 text-xs mt-0.5">{form.errors.fecha}</p>}
                </div>

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
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Cupo máximo</label>
                        <input type="number" min="1" max="100" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            placeholder="Sin límite"
                            value={form.data.cupo_maximo} onChange={e => form.setData('cupo_maximo', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Conductor</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.recolector_id} onChange={e => form.setData('recolector_id', e.target.value)}>
                            <option value="">Sin asignar</option>
                            {recolectores.map(w => (
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
                    <button onClick={submit} disabled={!form.data.fecha || form.processing}
                        className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40">
                        {form.processing ? 'Creando...' : 'Crear ruta'}
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
    const bg = isActive ? 'bg-cyan-700' : 'bg-zinc-300';

    return (
        <Link href={route('collection.show', slot.id)}>
            <div className={`rounded-lg p-2.5 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity ${bg}`}>
                {slot.hora_inicio && <div className="font-semibold leading-tight">{slot.hora_inicio.slice(0, 5)}</div>}
                {slot.recolector && <div className="opacity-75 mt-0.5 truncate">{slot.recolector}</div>}
                <div className="mt-1 font-medium">
                    {slot.paradas_count} parada{slot.paradas_count !== 1 ? 's' : ''} · {slot.cupos_ocupados}/{slot.cupo_maximo ?? '∞'}
                </div>
                {!isActive && (
                    <div className="mt-1 opacity-80 text-[10px] uppercase tracking-wide">{estadoLabel[estado]}</div>
                )}
            </div>
        </Link>
    );
}

// --- Mobile list item ---
function MobileSlotItem({ slot }) {
    return (
        <Link href={route('collection.show', slot.id)}>
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl flex items-stretch overflow-hidden">
                <div className={`w-1.5 shrink-0 ${slot.estado === 'abierto' ? 'bg-cyan-600' : 'bg-zinc-400'}`} />
                <div className="flex-1 flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-semibold text-zinc-800">
                                {slot.hora_inicio?.slice(0, 5) ?? '--:--'}
                            </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                            {[slot.recolector].filter(Boolean).join(' · ')}
                            {slot.estado !== 'abierto' && (
                                <span className="ml-1 text-amber-600">· {estadoLabel[slot.estado]}</span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-zinc-700">
                            {slot.paradas_count} parada{slot.paradas_count !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-zinc-400">{slot.cupos_ocupados}/{slot.cupo_maximo ?? '∞'} mascotas</div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// --- Main page ---
export default function CollectionIndex({ slots, recolectores, filters }) {
    const tz = useTenantTimezone();
    const [showCreate, setShowCreate] = useState(false);
    const today = dateKeyInTimezone(new Date(), tz);
    const weekDays = buildWeekDays(filters.week_start);
    const isCurrentWeek = weekDays.includes(today);
    const defaultDay = isCurrentWeek ? today : weekDays[0];
    const [selectedDay, setSelectedDay] = useState(null);
    const activeMobileDay = selectedDay && weekDays.includes(selectedDay) ? selectedDay : defaultDay;

    // Group slots by date
    const slotsByDay = Object.fromEntries(weekDays.map(d => [d, []]));
    slots.forEach(s => { if (s.fecha in slotsByDay) slotsByDay[s.fecha].push(s); });

    function goWeek(delta) {
        router.get(route('collection.index'), {
            week_start: addDays(filters.week_start, delta * 7),
            ...(filters.recolector_id ? { recolector_id: filters.recolector_id } : {}),
            ...(filters.estado ? { estado: filters.estado } : {}),
        }, { preserveState: false, replace: true });
    }

    function goThisWeek() {
        router.get(route('collection.index'), {
            ...(filters.recolector_id ? { recolector_id: filters.recolector_id } : {}),
            ...(filters.estado ? { estado: filters.estado } : {}),
        }, { preserveState: false, replace: true });
    }

    function setRecolectorFilter(id) {
        router.get(route('collection.index'), {
            week_start: filters.week_start,
            ...(id ? { recolector_id: id } : {}),
            ...(filters.estado ? { estado: filters.estado } : {}),
        }, { preserveState: false, replace: true });
    }

    return (
        <TenantLayout title="Recolección">
            {showCreate && <CreateSlotModal recolectores={recolectores} onClose={() => setShowCreate(false)} />}

            {/* Header */}
            <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-zinc-800">Recolección</h2>
                <div className="flex items-center gap-2">
                    <select className="border-gray-300 rounded-lg text-sm py-1.5"
                        value={filters.recolector_id ?? ''} onChange={e => setRecolectorFilter(e.target.value)}>
                        <option value="">Todos los conductores</option>
                        {recolectores.map(r => (
                            <option key={r.id} value={r.id}>{r.nombre} {r.apellido}</option>
                        ))}
                    </select>
                    <Link href={route('collection.config')} className="text-sm text-zinc-500 hover:text-zinc-700 px-2">
                        Tarifas
                    </Link>
                    <button onClick={() => setShowCreate(true)}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                        + Crear ruta
                    </button>
                </div>
            </div>

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
                            Sin rutas este día
                        </div>
                    )}
                </div>
            </div>
        </TenantLayout>
    );
}
