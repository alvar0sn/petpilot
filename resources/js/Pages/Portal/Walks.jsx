import PortalLayout from '@/Layouts/PortalLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';

const DAY_SHORT = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];
const tipoLabel = { grupal: 'Paseo grupal', privado: 'Paseo privado' };
const tipoBadge = { grupal: 'bg-blue-100 text-blue-700', privado: 'bg-violet-100 text-violet-700' };
const tipoBar   = { grupal: 'bg-blue-500',              privado: 'bg-violet-500' };

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

function formatDayHeader(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long',
    });
}

// --- Request modal ---
function RequestModal({ slot, pets, memberships, tenant, onClose }) {
    const form = useForm({ pet_id: '', cobro_membresia: false, membership_id: '', notas: '' });

    const selectedPetId = form.data.pet_id ? parseInt(form.data.pet_id) : null;
    const alreadyBooked = selectedPetId ? (slot.mis_mascotas ?? []).includes(selectedPetId) : false;

    const eligibleMembership = memberships.find(m => {
        const start = new Date(m.fecha_inicio + 'T00:00:00');
        const end   = new Date(m.fecha_vencimiento + 'T00:00:00');
        const fecha = new Date(slot.fecha + 'T00:00:00');
        return fecha >= start && fecha <= end && m.credito_paseo > 0;
    }) ?? null;

    function submit() {
        form.post(route('portal.walks.request', { tenant: tenant.slug, walkSlot: slot.id }), {
            onSuccess: onClose,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-4">
                <div>
                    <h3 className="font-semibold text-zinc-800">Solicitar lugar</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                        {tipoLabel[slot.tipo]} · {slot.hora_inicio?.slice(0, 5) ?? ''}
                        {slot.hora_fin ? ` – ${slot.hora_fin.slice(0, 5)}` : ''}
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">¿Para qué mascota?</label>
                    <select className="w-full border-zinc-300 rounded-lg text-sm py-2"
                        value={form.data.pet_id}
                        onChange={e => { form.setData('pet_id', e.target.value); form.setData('cobro_membresia', false); }}>
                        <option value="">Seleccionar...</option>
                        {pets.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {form.errors.pet_id && <p className="text-rose-500 text-xs mt-0.5">{form.errors.pet_id}</p>}
                    {alreadyBooked && (
                        <p className="text-amber-600 text-xs mt-0.5">Esta mascota ya tiene solicitud para este paseo.</p>
                    )}
                </div>

                {form.data.pet_id && eligibleMembership && !alreadyBooked && (
                    <label className="flex items-start gap-2 border border-zinc-200 rounded-xl p-3 bg-zinc-50 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 rounded border-zinc-300"
                            checked={form.data.cobro_membresia}
                            onChange={e => {
                                form.setData('cobro_membresia', e.target.checked);
                                form.setData('membership_id', e.target.checked ? eligibleMembership.id : '');
                            }} />
                        <span className="text-xs text-zinc-700">
                            Usar crédito de membresía <span className="font-medium">{eligibleMembership.plan}</span>
                            <span className="block text-zinc-400">{eligibleMembership.credito_paseo} crédito(s) disponibles</span>
                        </span>
                    </label>
                )}

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas (opcional)</label>
                    <input type="text" className="w-full border-zinc-300 rounded-lg text-sm py-2"
                        placeholder="Alguna indicación especial..."
                        value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                </div>

                <div className="flex gap-2">
                    <button onClick={onClose}
                        className="flex-1 border border-zinc-200 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={submit}
                        disabled={!form.data.pet_id || alreadyBooked || form.processing}
                        className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors">
                        {form.processing ? 'Enviando...' : 'Solicitar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main ---
export default function PortalWalks({ tenant, owner, slots, pets, memberships, week_start, today, current_monday, max_date }) {
    const weekDays = buildWeekDays(week_start);
    const isCurrentWeek = week_start === current_monday;
    const canGoPrev = week_start > current_monday;
    const canGoNext = max_date ? addDays(week_start, 7) <= max_date : true;
    const defaultDay = isCurrentWeek ? today : weekDays[0];

    const [selectedDay, setSelectedDay] = useState(defaultDay);
    const [requesting, setRequesting] = useState(null);

    // Index slots by date
    const slotsByDay = Object.fromEntries(weekDays.map(d => [d, []]));
    slots.forEach(s => { if (s.fecha in slotsByDay) slotsByDay[s.fecha].push(s); });

    const daySlots = slotsByDay[selectedDay] ?? [];

    function goWeek(delta) {
        router.get(
            route('portal.walks', tenant.slug),
            { week_start: addDays(week_start, delta * 7) },
            { preserveState: false, replace: true },
        );
    }

    function goThisWeek() {
        router.get(route('portal.walks', tenant.slug), {}, { preserveState: false, replace: true });
    }

    return (
        <PortalLayout tenant={tenant} owner={owner} current="walks">
            {/* Week navigator */}
            <div className="flex items-center justify-center gap-3 mb-5">
                <button onClick={() => goWeek(-1)} disabled={!canGoPrev}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-2xl font-light transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:bg-zinc-100 text-zinc-500">
                    ‹
                </button>
                <div className="text-center min-w-[160px]">
                    <div className="font-semibold text-zinc-800 text-sm">{formatWeekRange(weekDays)}</div>
                    {isCurrentWeek
                        ? <div className="text-xs text-zinc-400 mt-0.5">Esta semana</div>
                        : <button onClick={goThisWeek} className="text-xs text-zinc-500 hover:text-zinc-700 mt-0.5 underline-offset-2 hover:underline">
                            Ir a esta semana
                          </button>
                    }
                </div>
                <button onClick={() => goWeek(1)} disabled={!canGoNext}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-2xl font-light transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:bg-zinc-100 text-zinc-500">
                    ›
                </button>
            </div>

            {/* Day pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
                {weekDays.map(day => {
                    const dow      = dayOfWeek(day);
                    const isActive = day === selectedDay;
                    const isToday  = day === today;
                    const hasSlots = slotsByDay[day].length > 0;
                    return (
                        <button key={day} onClick={() => setSelectedDay(day)}
                            className={`flex-shrink-0 flex flex-col items-center w-12 py-2.5 rounded-xl border transition-colors ${
                                isActive
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                            }`}>
                            <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">
                                {DAY_SHORT[dow]}
                            </span>
                            <span className={`text-lg font-bold leading-tight mt-0.5 ${
                                !isActive && isToday ? 'text-zinc-900' : ''
                            }`}>
                                {dayNum(day)}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                                hasSlots
                                    ? isActive ? 'bg-white/70' : 'bg-zinc-400'
                                    : 'bg-transparent'
                            }`} />
                        </button>
                    );
                })}
            </div>

            {/* Day header */}
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3 capitalize">
                {formatDayHeader(selectedDay)}
            </h2>

            {/* Slots for selected day */}
            {daySlots.length === 0 ? (
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-10 text-center text-zinc-400 text-sm">
                    Sin paseos disponibles este día.
                </div>
            ) : (
                <div className="space-y-3">
                    {daySlots.map(slot => {
                        const isFull      = slot.cupo_maximo !== null && slot.cupos_disponibles !== null && slot.cupos_disponibles <= 0;
                        const myPets      = (slot.mis_mascotas ?? []).length;
                        return (
                            <div key={slot.id}
                                className="bg-white border border-zinc-100 shadow-sm rounded-xl flex overflow-hidden">
                                <div className={`w-1.5 shrink-0 ${tipoBar[slot.tipo] ?? 'bg-zinc-400'}`} />
                                <div className="flex-1 px-4 py-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadge[slot.tipo]}`}>
                                                    {tipoLabel[slot.tipo]}
                                                </span>
                                                {isFull && (
                                                    <span className="text-xs text-rose-500 font-medium">Lleno</span>
                                                )}
                                            </div>
                                            <div className="text-base font-semibold text-zinc-800 mt-1.5">
                                                {slot.hora_inicio?.slice(0, 5) ?? 'Horario por definir'}
                                                {slot.hora_fin && (
                                                    <span className="text-zinc-400 font-normal"> – {slot.hora_fin.slice(0, 5)}</span>
                                                )}
                                            </div>
                                            {slot.walker && (
                                                <div className="text-xs text-zinc-400 mt-0.5">Paseador: {slot.walker}</div>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            {slot.cupo_maximo !== null && (
                                                <div className={`text-xs mb-2 font-medium ${isFull ? 'text-rose-500' : 'text-zinc-500'}`}>
                                                    {isFull
                                                        ? 'Sin lugares'
                                                        : `${slot.cupos_disponibles} lugar${slot.cupos_disponibles !== 1 ? 'es' : ''} libre${slot.cupos_disponibles !== 1 ? 's' : ''}`
                                                    }
                                                </div>
                                            )}
                                            {!isFull && (
                                                <button onClick={() => setRequesting(slot)}
                                                    className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors">
                                                    Solicitar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {myPets > 0 && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                                            ✓ {myPets === 1
                                                ? 'Una de tus mascotas ya tiene solicitud aquí.'
                                                : `${myPets} de tus mascotas ya tienen solicitud aquí.`}
                                        </div>
                                    )}

                                    {slot.notas && (
                                        <p className="text-xs text-zinc-500 italic">{slot.notas}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {requesting && (
                <RequestModal
                    slot={requesting}
                    pets={pets}
                    memberships={memberships}
                    tenant={tenant}
                    onClose={() => setRequesting(null)}
                />
            )}
        </PortalLayout>
    );
}
