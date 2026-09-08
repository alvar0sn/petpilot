import TenantLayout from '@/Layouts/TenantLayout';
import ResponsivaStatus from '@/Components/ResponsivaStatus';
import { Link, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const estadoLabel = { abierto: 'Abierto', en_curso: 'En curso', completado: 'Completado', cancelado: 'Cancelado' };
const estadoColor = {
    abierto:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    en_curso:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    completado: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
    cancelado:  'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
};
const bookingEstadoLabel = { programado: 'Programado', en_ruta: 'En ruta', completado: 'Completado', cancelado: 'Cancelado' };
const bookingEstadoColor = {
    programado: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    en_ruta:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    completado: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelado:  'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
};
const tipoViajeLabel = { recoleccion: 'Recolección', entrega: 'Entrega', ida_y_vuelta: 'Ida y vuelta' };

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// Detecta si el dueño ya tiene otra mascota agendada en esta ruta — misma parada, mismo domicilio.
function findExistingBookingForOwner(slot, ownerId) {
    return (slot.bookings ?? []).find(b => b.owner_id === ownerId && b.estado !== 'cancelado');
}

function AddPetModal({ slot, rates, onClose }) {
    const { version } = usePage();
    const [petSearch, setPetSearch] = useState('');
    const [petResults, setPetResults] = useState([]);
    const [selectedPet, setSelectedPet] = useState(null);
    const [memberships, setMemberships] = useState([]);
    const [paqueteCreditos, setPaqueteCreditos] = useState([]);
    const [sameAddressNotice, setSameAddressNotice] = useState(null);
    const form = useForm({
        pet_id: '', owner_id: '', direccion: '', ubicacion_url: '', rate_id: '',
        tipo_viaje: 'recoleccion', cobro_membresia: false, membership_id: '', usar_paquete: true, notas: '',
    });

    async function searchPet(q) {
        setPetSearch(q);
        if (q.length < 2) { setPetResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: q }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        const owners = r.data?.props?.owners?.data ?? [];
        const pets = owners.flatMap(o => (o.pets ?? []).map(p => ({
            id: p.id, nombre: p.nombre, owner: o.nombre_completo, owner_id: o.id,
            direccion: o.direccion, ubicacion_url: o.ubicacion_url,
        })));
        setPetResults(pets.slice(0, 8));
    }

    async function selectPet(pet) {
        setSelectedPet(pet);
        setPetResults([]);

        // Mismo domicilio: si el dueño ya tiene otra mascota en esta ruta, reusamos su parada.
        const existing = findExistingBookingForOwner(slot, pet.owner_id);
        setSameAddressNotice(existing ? existing.pet?.nombre ?? null : null);

        form.setData({
            ...form.data,
            pet_id: pet.id,
            owner_id: pet.owner_id,
            direccion: existing?.direccion ?? pet.direccion ?? '',
            ubicacion_url: existing?.ubicacion_url ?? pet.ubicacion_url ?? '',
            rate_id: existing?.rate?.id ?? '',
            cobro_membresia: false,
            membership_id: '',
            usar_paquete: true,
        });

        try {
            const r = await axios.get(route('pets.show', pet.id), { headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
            const mems = r.data?.props?.activeMemberships ?? [];
            setMemberships(mems);
            const pkgs = r.data?.props?.activePackages ?? [];
            setPaqueteCreditos(pkgs.flatMap(p => p.credits ?? []));
            const slotDate = String(slot.fecha).slice(0, 10);
            const validMem = mems.find(m => {
                const toD = v => new Date(String(v).slice(0, 10) + 'T00:00:00');
                const d = toD(slotDate), s = toD(m.fecha_inicio), e = toD(m.fecha_vencimiento);
                return d >= s && d <= e;
            });
            const validCredit = validMem?.credits?.find(c => c.servicio_tipo === 'recoleccion');
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
    const credit = membership?.credits?.find(c => c.servicio_tipo === 'recoleccion');
    const hasCredits = credit && credit.saldo_actual > 0;

    const selectedRate = rates?.find(r => String(r.id) === String(form.data.rate_id));
    const paqueteCredito = selectedRate?.pos_item_id
        ? paqueteCreditos.find(c => c.pos_catalog_item_id === selectedRate.pos_item_id && c.saldo_actual > 0)
        : null;

    function submit() {
        form.post(route('collection.bookings.store', slot.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-5 w-full max-w-sm space-y-3 max-h-[92vh] overflow-y-auto">
                <h3 className="font-semibold text-zinc-800 text-sm">Agregar mascota a la ruta</h3>

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

                {sameAddressNotice && (
                    <p className="text-xs bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 rounded-lg px-2.5 py-1.5">
                        Mismo domicilio que <span className="font-medium">{sameAddressNotice}</span> — se agrupará en la misma parada.
                    </p>
                )}

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Dirección</label>
                    <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2}
                        value={form.data.direccion} onChange={e => form.setData('direccion', e.target.value)} />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Link de ubicación (Maps)</label>
                    <input className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                        value={form.data.ubicacion_url} onChange={e => form.setData('ubicacion_url', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Tarifa</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.rate_id} onChange={e => form.setData(d => ({ ...d, rate_id: e.target.value, usar_paquete: true }))}>
                            <option value="">Sin tarifa</option>
                            {rates.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre} — {fmt(r.precio)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de viaje</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.tipo_viaje} onChange={e => form.setData('tipo_viaje', e.target.value)}>
                            {Object.entries(tipoViajeLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </div>
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

                {selectedPet && !form.data.cobro_membresia && paqueteCredito && (
                    <label className="flex items-start gap-2 border border-indigo-200 rounded-lg p-2.5 bg-indigo-50 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 rounded"
                            checked={form.data.usar_paquete}
                            onChange={e => form.setData('usar_paquete', e.target.checked)} />
                        <span className="text-xs text-indigo-700">
                            Usar crédito de paquete <span className="font-medium">{paqueteCredito.nombre}</span>
                            <span className="text-indigo-500 block">{paqueteCredito.saldo_actual} disponible(s)</span>
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
    const canAdvance = ['programado', 'en_ruta'].includes(booking.estado);

    return (
        <div className={`rounded-lg border border-zinc-100 p-3 space-y-1.5 ${booking.estado === 'cancelado' ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-zinc-900">{booking.pet?.nombre}</span>
                    <span className="text-xs text-zinc-400">{tipoViajeLabel[booking.tipo_viaje]}</span>
                    {booking.cobro_membresia && <span className="text-xs bg-violet-50 text-violet-700 ring-1 ring-violet-200 px-2 py-0.5 rounded-full font-medium">membresía</span>}
                    {booking.package_credit_id && <span className="text-xs bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-2 py-0.5 rounded-full font-medium">paquete</span>}
                    {booking.rate && <span className="text-xs text-zinc-500">{booking.rate.nombre}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${bookingEstadoColor[booking.estado]}`}>{bookingEstadoLabel[booking.estado]}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {booking.estado === 'programado' && (
                        <button onClick={() => router.put(route('collection.bookings.estado', booking.id), { estado: 'en_ruta' })}
                            className="text-xs bg-amber-500 text-white px-2 py-1 rounded-lg hover:bg-amber-600 transition-colors">
                            En ruta
                        </button>
                    )}
                    {booking.estado === 'en_ruta' && (
                        <button onClick={() => router.put(route('collection.bookings.estado', booking.id), { estado: 'completado' })}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 transition-colors">
                            Completar
                        </button>
                    )}
                    {canAdvance && !cancelMode && (
                        <button onClick={() => setCancelMode(true)} className="text-xs border border-red-300 text-red-600 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors">Cancelar</button>
                    )}
                </div>
            </div>

            {booking.notas && <div className="text-xs text-zinc-400">{booking.notas}</div>}

            {booking.estado !== 'cancelado' && (
                <ResponsivaStatus compact
                    sendUrl={route('collection.bookings.responsiva.send', booking.id)}
                    downloadUrl={route('collection.bookings.responsiva.download', booking.id)}
                    enviadoAt={booking.responsiva_enviado_at}
                    firmadoAt={booking.responsiva_firmado_at}
                />
            )}

            {cancelMode && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-rose-700">¿Cancelar a {booking.pet?.nombre}?</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCancelMode(false)} className="text-xs border border-zinc-200 px-2 py-0.5 rounded-lg">No</button>
                        <button onClick={() => router.post(route('collection.bookings.cancel', booking.id))}
                            className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-lg">Sí</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ParadaCard({ parada }) {
    const activas = parada.bookings.filter(b => b.estado !== 'cancelado');
    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-800 text-sm">{parada.owner ?? '—'}</span>
                        <span className="text-xs bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 rounded-full px-2 py-0.5 font-medium">
                            {activas.length} mascota{activas.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {parada.direccion && <p className="text-xs text-zinc-500 mt-0.5">{parada.direccion}</p>}
                </div>
                {parada.ubicacion_url && (
                    <a href={parada.ubicacion_url} target="_blank" rel="noreferrer"
                        className="text-xs text-zinc-600 border border-zinc-200 rounded-lg px-2.5 py-1 hover:bg-zinc-50 transition-colors shrink-0">
                        Ver ubicación →
                    </a>
                )}
            </div>
            <div className="space-y-2">
                {parada.bookings.map(b => <BookingRow key={b.id} booking={b} />)}
            </div>
        </div>
    );
}

export default function CollectionShow({ slot, recolectores, paradas, rates }) {
    const tz = useTenantTimezone();
    const [showAddPet, setShowAddPet] = useState(false);
    const [cancelSlot, setCancelSlot] = useState(false);

    const form = useForm({
        fecha: slot.fecha?.slice(0, 10) ?? '',
        hora_inicio: slot.hora_inicio?.slice(0, 5) ?? '',
        hora_fin: slot.hora_fin?.slice(0, 5) ?? '',
        cupo_maximo: slot.cupo_maximo ?? '',
        recolector_id: slot.recolector_id ?? '',
        notas: slot.notas ?? '',
    });

    const canEdit = ['abierto', 'en_curso'].includes(slot.estado);
    const activeBookings = (slot.bookings ?? []).filter(b => b.estado !== 'cancelado');

    return (
        <TenantLayout title="Ruta de recolección">
            {showAddPet && <AddPetModal slot={slot} rates={rates} onClose={() => setShowAddPet(false)} />}

            <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
                <Link href={route('collection.index')} className="hover:text-zinc-700 transition-colors">Recolección</Link>
                <span>›</span>
                <span className="text-zinc-800">{formatDate(slot.fecha, tz)}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoColor[slot.estado]}`}>{estadoLabel[slot.estado]}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 font-medium inline-flex items-center">
                                    {paradas.length} parada{paradas.length !== 1 ? 's' : ''}
                                </span>
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
                                <p className="text-xs text-zinc-400">Conductor</p>
                                <p className="font-medium">{slot.recolector ? `${slot.recolector.nombre} ${slot.recolector.apellido}` : 'Sin asignar'}</p>
                            </div>
                            {slot.cupo_maximo && (
                                <div>
                                    <p className="text-xs text-zinc-400">Cupos</p>
                                    <p className="font-medium">{activeBookings.length}/{slot.cupo_maximo}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-zinc-700 text-sm">
                                Paradas ({paradas.length}) · {activeBookings.length} mascota{activeBookings.length !== 1 ? 's' : ''}
                            </h3>
                            {canEdit && (
                                <button onClick={() => setShowAddPet(true)}
                                    className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 transition-colors">
                                    + Agregar mascota
                                </button>
                            )}
                        </div>
                        {paradas.map(p => <ParadaCard key={p.owner_id} parada={p} />)}
                        {paradas.length === 0 && (
                            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
                                Sin mascotas en esta ruta aún.
                            </div>
                        )}
                    </div>

                    {canEdit && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                            <h3 className="font-semibold text-zinc-700 text-sm">Editar ruta</h3>
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
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Conductor</label>
                                    <select className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                        value={form.data.recolector_id} onChange={e => form.setData('recolector_id', e.target.value)}>
                                        <option value="">Sin asignar</option>
                                        {recolectores.map(w => <option key={w.id} value={w.id}>{w.nombre} {w.apellido}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
                                <textarea className="w-full border-gray-300 rounded-lg text-sm resize-none" rows={2}
                                    value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                            </div>
                            <button onClick={() => form.put(route('collection.update', slot.id))} disabled={form.processing}
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
                            <button onClick={() => router.post(route('collection.complete', slot.id))}
                                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                                Marcar completada
                            </button>
                            <button onClick={() => setCancelSlot(true)}
                                className="w-full border border-red-300 text-red-600 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">
                                Cancelar ruta
                            </button>
                            {cancelSlot && (
                                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-2">
                                    <p className="text-xs text-rose-700">¿Cancelar esta ruta? Todas las reservas activas se cancelarán también.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCancelSlot(false)} className="flex-1 border border-zinc-200 text-xs py-1 rounded-lg">No</button>
                                        <button onClick={() => router.post(route('collection.cancel', slot.id))}
                                            className="flex-1 bg-rose-600 text-white text-xs py-1 rounded-lg font-medium">Sí, cancelar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-2 text-sm">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</h4>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Paradas</span>
                            <span className="font-medium">{paradas.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Mascotas</span>
                            <span className="font-medium">{activeBookings.length}</span>
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
                </div>
            </div>
        </TenantLayout>
    );
}
