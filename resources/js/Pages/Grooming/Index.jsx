import AppointmentTimePicker from '@/Components/AppointmentTimePicker';
import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';

const MOBILE_DAY  = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SÁ'];
const DESKTOP_DAY = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];

const estadoBg = {
    pendiente:  'bg-amber-500',
    confirmada: 'bg-sky-600',
    completada: 'bg-emerald-600',
    cancelada:  'bg-zinc-400',
    no_show:    'bg-zinc-400',
};
const estadoLabel = {
    pendiente:  'Pendiente',
    confirmada: 'Confirmada',
    completada: 'Completada',
    cancelada:  'Cancelada',
    no_show:    'No presentó',
};

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}
function buildWeekDays(weekStart) { return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)); }
function dayOfWeek(dateStr) { return new Date(dateStr + 'T12:00:00').getDay(); }
function dayNum(dateStr) { return new Date(dateStr + 'T12:00:00').getDate(); }
function formatWeekRange(weekDays) {
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `${fmt(weekDays[0])} — ${fmt(weekDays[6])}`;
}
function today() { return new Date().toLocaleDateString('sv-SE'); }

function NewAppointmentModal({ groomers, stations, eventTypes, catalogItems, defaultDate, onClose }) {
    const { version } = usePage();
    const form = useForm({
        pet_id: '', tipo_servicio_id: eventTypes[0]?.id ?? '', fecha: defaultDate,
        hora_inicio: '', hora_fin: '', groomer_id: '', station_id: '',
        notas_internas: '', cobro_membresia: false, membership_id: '', items: [],
    });
    const [duracion, setDuracion] = useState(null);
    const [petSearch, setPetSearch] = useState('');
    const [petResults, setPetResults] = useState([]);
    const [selectedPet, setSelectedPet] = useState(null);

    async function searchPet(q) {
        setPetSearch(q);
        if (q.length < 2) { setPetResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: q }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        const owners = r.data?.props?.owners?.data ?? [];
        const pets = owners.flatMap(o => (o.pets ?? []).map(p => ({
            id: p.id, nombre: p.nombre, owner: o.nombre_completo,
            membership_id: p.membership_id ?? null, creditos_estetica: p.creditos_estetica ?? 0,
        })));
        setPetResults(pets.slice(0, 8));
    }

    function selectPet(pet) {
        setSelectedPet(pet);
        setPetResults([]);
        form.setData(d => ({ ...d, pet_id: pet.id, cobro_membresia: false, membership_id: pet.membership_id ?? '' }));
    }

    const [itemDraft, setItemDraft] = useState({ catalog_item_id: '', nombre: '', precio: '', cantidad: '1' });

    function addItem() {
        if (!itemDraft.nombre || itemDraft.precio === '') return;
        form.setData('items', [...form.data.items, { ...itemDraft, cantidad: parseFloat(itemDraft.cantidad) || 1 }]);
        setItemDraft({ catalog_item_id: '', nombre: '', precio: '', cantidad: '1' });
    }
    function removeItem(idx) { form.setData('items', form.data.items.filter((_, i) => i !== idx)); }
    function pickCatalogItem(e) {
        const id = e.target.value;
        const found = catalogItems.find(c => String(c.id) === id);
        setItemDraft(d => ({ ...d, catalog_item_id: id, nombre: found?.nombre ?? d.nombre, precio: found ? String(found.precio) : d.precio }));
    }
    function submit(e) { e.preventDefault(); form.post(route('grooming.store'), { onSuccess: onClose }); }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form onSubmit={submit} className="bg-white border border-zinc-200 rounded-xl shadow-lg p-5 w-full max-w-lg space-y-3 max-h-[92vh] overflow-y-auto">
                <h3 className="font-semibold text-zinc-800 text-sm">Nueva cita de grooming</h3>

                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Mascota *</label>
                        <div className="relative">
                            <input className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                placeholder="Buscar mascota..."
                                value={selectedPet ? selectedPet.nombre : petSearch}
                                onChange={e => { setSelectedPet(null); searchPet(e.target.value); }} />
                            {petResults.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                    {petResults.map(p => (
                                        <button key={p.id} type="button" onClick={() => selectPet(p)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors">
                                            <span className="font-medium">{p.nombre}</span>
                                            <span className="text-zinc-400 ml-2">{p.owner}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {form.errors.pet_id && <p className="text-rose-500 text-xs mt-0.5">{form.errors.pet_id}</p>}
                    </div>

                    {selectedPet?.membership_id && (
                        <div className="col-span-2">
                            <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.data.cobro_membresia ? 'bg-zinc-50 border-zinc-400' : 'border-zinc-200 hover:border-zinc-300'}`}>
                                <input type="checkbox" checked={form.data.cobro_membresia}
                                    onChange={e => form.setData('cobro_membresia', e.target.checked)} className="rounded" />
                                <span className="text-sm font-medium text-zinc-700">
                                    Cobrar con membresía
                                    <span className="ml-1.5 text-xs font-normal text-zinc-500">
                                        ({selectedPet.creditos_estetica} crédito{selectedPet.creditos_estetica !== 1 ? 's' : ''} de estética disponible{selectedPet.creditos_estetica !== 1 ? 's' : ''})
                                    </span>
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de servicio *</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.tipo_servicio_id} onChange={e => form.setData('tipo_servicio_id', e.target.value)} required>
                            {eventTypes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha *</label>
                        <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.fecha} onChange={e => form.setData('fecha', e.target.value)} required />
                        {form.errors.fecha && <p className="text-rose-500 text-xs mt-0.5">{form.errors.fecha}</p>}
                    </div>

                    <div className="col-span-2">
                        <AppointmentTimePicker horaInicio={form.data.hora_inicio} duracion={duracion}
                            onChange={(hi, hf, dur) => { form.setData(d => ({ ...d, hora_inicio: hi, hora_fin: hf })); setDuracion(dur); }} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Groomer</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.groomer_id} onChange={e => form.setData('groomer_id', e.target.value)}>
                            <option value="">Sin asignar</option>
                            {groomers.map(g => <option key={g.id} value={g.id}>{g.nombre} {g.apellido}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Estación</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.station_id} onChange={e => form.setData('station_id', e.target.value)}>
                            <option value="">Sin asignar</option>
                            {stations.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Servicios / productos</label>
                    {form.data.items.length > 0 && (
                        <div className="mb-2 divide-y border border-zinc-100 rounded-lg text-xs">
                            {form.data.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="flex-1">{item.nombre}</span>
                                    <span className="text-zinc-500">{item.cantidad}x ${Number(item.precio).toFixed(2)}</span>
                                    <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-12 gap-1">
                        <select className="col-span-4 border-gray-300 rounded-lg text-xs" value={itemDraft.catalog_item_id} onChange={pickCatalogItem}>
                            <option value="">Del catálogo...</option>
                            {catalogItems.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <input className="col-span-3 border-gray-300 rounded-lg text-xs" placeholder="Nombre *" value={itemDraft.nombre} onChange={e => setItemDraft(d => ({ ...d, nombre: e.target.value }))} />
                        <input type="number" step="0.01" className="col-span-2 border-gray-300 rounded-lg text-xs" placeholder="Precio" value={itemDraft.precio} onChange={e => setItemDraft(d => ({ ...d, precio: e.target.value }))} />
                        <input type="number" step="0.01" min="0.01" className="col-span-2 border-gray-300 rounded-lg text-xs" placeholder="Cant." value={itemDraft.cantidad} onChange={e => setItemDraft(d => ({ ...d, cantidad: e.target.value }))} />
                        <button type="button" onClick={addItem} className="col-span-1 text-zinc-700 font-bold text-sm hover:text-zinc-900 transition-colors">+</button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas internas</label>
                    <textarea className="w-full border-gray-300 rounded-lg text-sm resize-none" rows={2} value={form.data.notas_internas} onChange={e => form.setData('notas_internas', e.target.value)} />
                </div>

                <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">Cancelar</button>
                    <button type="submit" disabled={form.processing} className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                        {form.processing ? 'Agendando...' : 'Agendar cita'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function AppointmentCard({ appt }) {
    const bg = estadoBg[appt.estado] ?? 'bg-zinc-400';
    return (
        <Link href={route('grooming.show', appt.id)}>
            <div className={`rounded-lg p-2.5 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity ${bg}`}>
                <div className="font-semibold leading-tight truncate">{appt.pet}</div>
                {appt.hora_inicio && <div className="opacity-90 mt-0.5">{appt.hora_inicio.slice(0, 5)}</div>}
                {appt.tipo_servicio && <div className="opacity-80 truncate">{appt.tipo_servicio}</div>}
                {appt.groomer && <div className="opacity-75 mt-0.5 truncate">{appt.groomer}</div>}
                {appt.station && <div className="opacity-70 mt-0.5 truncate text-[10px]">{appt.station}</div>}
            </div>
        </Link>
    );
}

function MobileAppointmentItem({ appt }) {
    const borderBg = estadoBg[appt.estado] ?? 'bg-zinc-400';
    return (
        <Link href={route('grooming.show', appt.id)}>
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl flex items-stretch overflow-hidden">
                <div className={`w-1.5 shrink-0 ${borderBg}`} />
                <div className="flex-1 flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-semibold text-zinc-800">{appt.hora_inicio?.slice(0, 5) ?? '--:--'}</span>
                            <span className="font-medium text-zinc-800 text-sm truncate">{appt.pet}</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5 truncate">
                            {[appt.tipo_servicio, appt.groomer, appt.station].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                    <span className={`shrink-0 text-[10px] uppercase font-medium px-1.5 py-0.5 rounded text-white ${borderBg}`}>
                        {estadoLabel[appt.estado]}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default function GroomingIndex({ appointments, weekStart, stations, eventTypes, groomers, catalogItems }) {
    const [showCreate, setShowCreate] = useState(false);
    const [createDate, setCreateDate] = useState(today());
    const todayStr = today();
    const weekDays = buildWeekDays(weekStart);
    const isCurrentWeek = weekDays.includes(todayStr);
    const defaultDay = isCurrentWeek ? todayStr : weekDays[0];
    const [selectedDay, setSelectedDay] = useState(null);
    const activeMobileDay = selectedDay && weekDays.includes(selectedDay) ? selectedDay : defaultDay;

    const byDay = Object.fromEntries(weekDays.map(d => [d, []]));
    appointments.forEach(a => { if (a.fecha in byDay) byDay[a.fecha].push(a); });

    function goWeek(delta) {
        router.get(route('grooming.index'), { week_start: addDays(weekStart, delta * 7) }, { preserveState: false, replace: true });
    }
    function openCreate(date) { setCreateDate(date); setShowCreate(true); }

    return (
        <TenantLayout title="Grooming">
            {showCreate && (
                <NewAppointmentModal groomers={groomers} stations={stations} eventTypes={eventTypes}
                    catalogItems={catalogItems} defaultDate={createDate} onClose={() => setShowCreate(false)} />
            )}

            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">Grooming</h2>
                <button onClick={() => openCreate(todayStr)}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                    + Nueva cita
                </button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
                <button onClick={() => goWeek(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 text-xl font-light transition-colors">‹</button>
                <div className="text-center min-w-[160px]">
                    <div className="font-semibold text-zinc-800">{formatWeekRange(weekDays)}</div>
                    {isCurrentWeek
                        ? <div className="text-xs text-zinc-500 font-medium mt-0.5">Esta semana</div>
                        : <button onClick={() => router.get(route('grooming.index'), {}, { preserveState: false, replace: true })} className="text-xs text-zinc-500 hover:text-zinc-700 mt-0.5 transition-colors">Ir a esta semana</button>
                    }
                </div>
                <button onClick={() => goWeek(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 text-xl font-light transition-colors">›</button>
            </div>

            <div className="hidden sm:block">
                <div className="grid grid-cols-7 gap-2 mb-3">
                    {weekDays.map(day => {
                        const isToday = day === todayStr;
                        return (
                            <div key={day} className="text-center">
                                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{DESKTOP_DAY[dayOfWeek(day)]}</div>
                                <div className={`text-xl font-bold mt-0.5 ${isToday ? 'text-zinc-900' : 'text-zinc-600'}`}>{dayNum(day)}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map(day => (
                        <div key={day} className="space-y-1.5 min-h-[3rem]">
                            {byDay[day].map(a => <AppointmentCard key={a.id} appt={a} />)}
                            <button onClick={() => openCreate(day)} className="w-full text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 rounded text-xs py-1 border border-dashed border-zinc-200 hover:border-zinc-300 transition-colors">
                                + cita
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="sm:hidden">
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
                    {weekDays.map(day => {
                        const isActive = day === activeMobileDay;
                        const isToday = day === todayStr;
                        const hasAppts = byDay[day].length > 0;
                        return (
                            <button key={day} onClick={() => setSelectedDay(day)}
                                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-colors ${isActive ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`}>
                                <span className="text-[11px] font-semibold">{MOBILE_DAY[dayOfWeek(day)]}</span>
                                <span className={`text-lg font-bold leading-tight ${isActive ? 'text-white' : isToday ? 'text-zinc-900' : 'text-zinc-700'}`}>{dayNum(day)}</span>
                                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${hasAppts ? isActive ? 'bg-white' : 'bg-zinc-400' : 'invisible'}`} />
                            </button>
                        );
                    })}
                </div>
                <div className="space-y-3">
                    {byDay[activeMobileDay].map(a => <MobileAppointmentItem key={a.id} appt={a} />)}
                    {byDay[activeMobileDay].length === 0 && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">Sin citas este día</div>
                    )}
                    <button onClick={() => openCreate(activeMobileDay)} className="w-full border border-dashed border-zinc-300 text-zinc-500 py-3 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
                        + Nueva cita este día
                    </button>
                </div>
            </div>
        </TenantLayout>
    );
}
