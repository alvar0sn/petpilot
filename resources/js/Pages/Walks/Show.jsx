import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const tipoLabel = { grupal: 'Paseo grupal', privado: 'Paseo privado' };
const tipoColor = { grupal: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', privado: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' };
const estadoLabel = { abierto: 'Abierto', en_curso: 'En curso', completado: 'Completado', cancelado: 'Cancelado' };
const estadoColor = {
    abierto:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    en_curso:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    completado: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
    cancelado:  'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
};
const bookingEstadoLabel = { solicitado: 'Solicitado', aprobado: 'Aprobado', cancelado: 'Cancelado' };
const bookingEstadoColor = {
    solicitado: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    aprobado:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelado:  'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
};

function AddPetModal({ slot, walkers, onClose }) {
    const { version } = usePage();
    const [petSearch, setPetSearch] = useState('');
    const [petResults, setPetResults] = useState([]);
    const [selectedPet, setSelectedPet] = useState(null);
    const [memberships, setMemberships] = useState([]);
    const form = useForm({ pet_id: '', owner_id: '', cobro_membresia: false, membership_id: '', notas: '' });

    async function searchPet(q) {
        setPetSearch(q);
        if (q.length < 2) { setPetResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: q }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        const owners = r.data?.props?.owners?.data ?? [];
        const pets = owners.flatMap(o => (o.pets ?? []).map(p => ({ id: p.id, nombre: p.nombre, owner: o.nombre_completo, owner_id: o.id })));
        setPetResults(pets.slice(0, 8));
    }

    async function selectPet(pet) {
        setSelectedPet(pet);
        setPetResults([]);
        form.setData({ ...form.data, pet_id: pet.id, owner_id: pet.owner_id, cobro_membresia: false, membership_id: '' });
        try {
            const r = await axios.get(route('pets.show', pet.id), { headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
            const mems = r.data?.props?.activeMemberships ?? [];
            setMemberships(mems);
            const slotDate = String(slot.fecha).slice(0, 10);
            const validMem = mems.find(m => {
                const toD = v => new Date(String(v).slice(0, 10) + 'T00:00:00');
                const d = toD(slotDate), s = toD(m.fecha_inicio), e = toD(m.fecha_vencimiento);
                return d >= s && d <= e;
            });
            const validCredit = validMem?.credits?.find(c => c.servicio_tipo === 'paseo');
            if (validMem && validCredit && validCredit.saldo_actual > 0) {
                form.setData('cobro_membresia', true);
                form.setData('membership_id', validMem.id);
            }
        } catch (e) {}
    }

    function toDate(v) { return new Date(String(v).slice(0, 10) + 'T00:00:00'); }
    function dateInRange(dateStr, s, e) {
        if (!dateStr || !s || !e) return false;
        const d = toDate(dateStr), start = toDate(s), end = toDate(e);
        return d >= start && d <= end;
    }

    const fecha = String(slot.fecha).slice(0, 10);
    const membership = memberships.find(m => dateInRange(fecha, m.fecha_inicio, m.fecha_vencimiento)) ?? null;
    const credit = membership?.credits?.find(c => c.servicio_tipo === 'paseo');
    const hasCredits = credit && credit.saldo_actual > 0;

    function submit() {
        form.post(route('walks.bookings.store', slot.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-5 w-full max-w-sm space-y-3">
                <h3 className="font-semibold text-zinc-800 text-sm">Agregar mascota al paseo</h3>

                <div className="relative">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Mascota *</label>
                    <input className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                        placeholder="Buscar mascota..."
                        value={selectedPet ? selectedPet.nombre : petSearch}
                        onChange={e => { setSelectedPet(null); searchPet(e.target.value); }} />
                    {petResults.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {petResults.map(p => (
                                <button key={p.id} onClick={() => selectPet(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors">
                                    <span className="font-medium">{p.nombre}</span>
                                    <span className="text-zinc-400 ml-2">{p.owner}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {form.errors.pet_id && <p className="text-rose-500 text-xs mt-0.5">{form.errors.pet_id}</p>}
                </div>

                {selectedPet && hasCredits && (
                    <label className="flex items-start gap-2 border border-zinc-200 rounded-lg p-2.5 bg-zinc-50 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 rounded"
                            checked={form.data.cobro_membresia}
                            onChange={e => { form.setData('cobro_membresia', e.target.checked); form.setData('membership_id', e.target.checked ? membership.id : ''); }} />
                        <span className="text-xs text-zinc-700">
                            Cobrar con membresía <span className="font-medium">{membership.plan?.nombre}</span>
                            <span className="text-zinc-500 block">{credit.saldo_actual} crédito(s) disponibles</span>
                        </span>
                    </label>
                )}

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
                    <input type="text" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                        value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">Cancelar</button>
                    <button onClick={submit} disabled={!form.data.pet_id || form.processing}
                        className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                        {form.processing ? 'Agregando...' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BookingRow({ booking }) {
    const [cancelMode, setCancelMode] = useState(false);

    return (
        <div className={`rounded-lg border border-zinc-100 p-3 space-y-2 ${booking.estado === 'cancelado' ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-900">{booking.pet?.nombre}</span>
                    {booking.cobro_membresia && <span className="text-xs bg-violet-50 text-violet-700 ring-1 ring-violet-200 px-2 py-0.5 rounded-full font-medium">membresía</span>}
                    {booking.solicitud_owner && <span className="text-xs text-zinc-400">portal</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${bookingEstadoColor[booking.estado]}`}>{bookingEstadoLabel[booking.estado]}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {booking.estado === 'solicitado' && (
                        <button onClick={() => router.post(route('walks.bookings.approve', booking.id))}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 transition-colors">
                            Aprobar
                        </button>
                    )}
                    {booking.estado !== 'cancelado' && !cancelMode && (
                        <button onClick={() => setCancelMode(true)} className="text-xs border border-red-300 text-red-600 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors">Cancelar</button>
                    )}
                </div>
            </div>

            <div className="text-xs text-zinc-500">
                {booking.owner?.nombre_completo ?? booking.owner?.nombre}
                {booking.notas && <span className="ml-2 text-zinc-400">· {booking.notas}</span>}
            </div>

            {cancelMode && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-rose-700">¿Cancelar a {booking.pet?.nombre}?</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCancelMode(false)} className="text-xs border border-zinc-200 px-2 py-0.5 rounded-lg">No</button>
                        <button onClick={() => router.post(route('walks.bookings.cancel', booking.id))}
                            className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-lg">Sí</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ExtendRecurrencePanel({ recurrence }) {
    const form = useForm({ weeks: '4' });

    function extend() {
        form.post(route('walks.recurrences.extend', recurrence.id), { preserveScroll: true });
    }

    const lastDate = recurrence.last_slot_date
        ? new Date(recurrence.last_slot_date + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-3 border-l-4 border-l-zinc-400">
            <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Serie recurrente</p>
                <p className="text-sm font-medium text-zinc-800 mt-0.5">{recurrence.pattern_label}</p>
                <p className="text-xs text-zinc-500">
                    {recurrence.total_slots} slot{recurrence.total_slots !== 1 ? 's' : ''} generado{recurrence.total_slots !== 1 ? 's' : ''} · último: {lastDate}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <select className="border-gray-300 rounded-lg text-xs py-1.5 flex-1"
                    value={form.data.weeks} onChange={e => form.setData('weeks', e.target.value)}>
                    {[2, 4, 6, 8, 12].map(w => <option key={w} value={w}>+{w} semanas</option>)}
                </select>
                <button onClick={extend} disabled={form.processing}
                    className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                    {form.processing ? '...' : 'Extender'}
                </button>
            </div>
            <Link href={route('walks.index')} className="text-xs text-zinc-500 hover:underline">
                Ver todos los slots de esta serie →
            </Link>
        </div>
    );
}

export default function WalksShow({ slot, walkers, recurrence }) {
    const tz = useTenantTimezone();
    const [showAddPet, setShowAddPet] = useState(false);
    const [cancelSlot, setCancelSlot] = useState(false);

    const form = useForm({
        fecha: slot.fecha?.slice(0, 10) ?? '',
        hora_inicio: slot.hora_inicio?.slice(0, 5) ?? '',
        hora_fin: slot.hora_fin?.slice(0, 5) ?? '',
        cupo_maximo: slot.cupo_maximo ?? '',
        walker_id: slot.walker_id ?? '',
        notas: slot.notas ?? '',
    });

    const canEdit = ['abierto', 'en_curso'].includes(slot.estado);
    const activeBookings = (slot.bookings ?? []).filter(b => b.estado !== 'cancelado');
    const pendingBookings = (slot.bookings ?? []).filter(b => b.estado === 'solicitado');

    return (
        <TenantLayout title="Slot de paseo">
            {showAddPet && <AddPetModal slot={slot} walkers={walkers} onClose={() => setShowAddPet(false)} />}

            <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
                <Link href={route('walks.index')} className="hover:text-zinc-700 transition-colors">Paseos</Link>
                <span>›</span>
                <span className="text-zinc-800">{tipoLabel[slot.tipo]} · {formatDate(slot.fecha, tz)}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${tipoColor[slot.tipo]}`}>{tipoLabel[slot.tipo]}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoColor[slot.estado]}`}>{estadoLabel[slot.estado]}</span>
                                {pendingBookings.length > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-medium inline-flex items-center">
                                        {pendingBookings.length} solicitud{pendingBookings.length > 1 ? 'es' : ''} pendiente{pendingBookings.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-zinc-400">Fecha</p>
                                <p className="font-medium">{formatDate(slot.fecha, tz)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">Horario</p>
                                <p className="font-medium font-mono">
                                    {slot.hora_inicio?.slice(0,5) ?? '—'}{slot.hora_fin ? ` – ${slot.hora_fin.slice(0,5)}` : ''}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">Paseador</p>
                                <p className="font-medium">{slot.walker ? `${slot.walker.nombre} ${slot.walker.apellido}` : 'Sin asignar'}</p>
                            </div>
                            {slot.cupo_maximo && (
                                <div>
                                    <p className="text-xs text-zinc-400">Cupos</p>
                                    <p className="font-medium">{activeBookings.length}/{slot.cupo_maximo}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-zinc-700 text-sm">Mascotas ({activeBookings.length})</h3>
                            {canEdit && (
                                <button onClick={() => setShowAddPet(true)}
                                    className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors">
                                    + Agregar mascota
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(slot.bookings ?? []).map(b => <BookingRow key={b.id} booking={b} />)}
                            {(slot.bookings ?? []).length === 0 && (
                                <p className="text-sm text-zinc-400 py-4 text-center">Sin mascotas en este slot aún.</p>
                            )}
                        </div>
                    </div>

                    {canEdit && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                            <h3 className="font-semibold text-zinc-700 text-sm">Editar slot</h3>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                    value={form.data.fecha} onChange={e => form.setData('fecha', e.target.value)} />
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
                                    <input type="number" min="1" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                        placeholder="Sin límite"
                                        value={form.data.cupo_maximo} onChange={e => form.setData('cupo_maximo', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Paseador</label>
                                    <select className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                        value={form.data.walker_id} onChange={e => form.setData('walker_id', e.target.value)}>
                                        <option value="">Sin asignar</option>
                                        {walkers.map(w => <option key={w.id} value={w.id}>{w.nombre} {w.apellido}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
                                <textarea className="w-full border-gray-300 rounded-lg text-sm resize-none" rows={2}
                                    value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                            </div>
                            <button onClick={() => form.put(route('walks.update', slot.id))} disabled={form.processing}
                                className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                                {form.processing ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {canEdit && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Acciones</h4>
                            <button onClick={() => router.post(route('walks.complete', slot.id))}
                                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                                Marcar completado
                            </button>
                            <button onClick={() => setCancelSlot(true)}
                                className="w-full border border-red-300 text-red-600 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">
                                Cancelar slot
                            </button>
                            {cancelSlot && (
                                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2">
                                    <p className="text-xs text-rose-700">¿Cancelar este slot? Todas las reservas activas se cancelarán también.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCancelSlot(false)} className="flex-1 border border-zinc-200 text-xs py-1 rounded-lg">No</button>
                                        <button onClick={() => router.post(route('walks.cancel', slot.id))}
                                            className="flex-1 bg-rose-600 text-white text-xs py-1 rounded-lg font-medium">Sí, cancelar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-2 text-sm">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</h4>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Tipo</span>
                            <span className="font-medium">{tipoLabel[slot.tipo]}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Aprobados</span>
                            <span className="font-medium">{(slot.bookings ?? []).filter(b => b.estado === 'aprobado').length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Solicitados</span>
                            <span className={`font-medium ${pendingBookings.length > 0 ? 'text-amber-600' : ''}`}>{pendingBookings.length}</span>
                        </div>
                        {slot.cupo_maximo && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Cupos libres</span>
                                <span className="font-medium">{Math.max(0, slot.cupo_maximo - activeBookings.length)}</span>
                            </div>
                        )}
                        {slot.createdBy && (
                            <div className="flex justify-between pt-2 border-t border-zinc-100">
                                <span className="text-zinc-500">Creado por</span>
                                <span className="font-medium">{slot.createdBy.nombre}</span>
                            </div>
                        )}
                    </div>

                    {recurrence && <ExtendRecurrencePanel recurrence={recurrence} />}
                </div>
            </div>
        </TenantLayout>
    );
}
