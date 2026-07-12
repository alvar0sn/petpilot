import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { dateKeyInTimezone, formatDate, isSameDayInTimezone, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function toLocalDay(d) {
    const m = typeof d === 'string' && d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const x = new Date(d);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function dateInRange(dateStr, startStr, endStr) {
    if (!dateStr || !startStr || !endStr) return false;
    const d = toLocalDay(dateStr), start = toLocalDay(startStr), end = toLocalDay(endStr);
    return d >= start && d <= end;
}

function EarlyCheckinModal({ stay, onClose }) {
    const tz = useTenantTimezone();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="font-semibold text-zinc-800">Aún no se puede hacer check-in</h3>
                <p className="text-sm text-zinc-600">
                    La entrada de <span className="font-medium">{stay.pet}</span> está programada para el <span className="font-medium">{formatDate(stay.fecha_entrada, tz)}</span>. El check-in solo se puede realizar el día programado de entrada.
                </p>
                <p className="text-sm text-zinc-500">
                    Si la mascota ya llegó, abre la reserva y ajusta la fecha de entrada antes de hacer check-in.
                </p>
                <div className="flex gap-2">
                    <Link href={route('hotel.show', stay.id)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm text-center hover:bg-zinc-50 font-medium transition-colors">
                        Ver reserva
                    </Link>
                    <button onClick={onClose} className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

const tipoLabel = { guarderia: 'Guardería', hotel: 'Hotel' };
const tipoColor = { guarderia: 'bg-blue-100 text-blue-700', hotel: 'bg-purple-100 text-purple-700' };
const estadoLabel = { reservado: 'Reservado', activo: 'Activo', completado: 'Completado', cancelado: 'Cancelado', no_presento: 'No se presentó' };
const estadoColor = {
    reservado: 'bg-amber-100 text-amber-700',
    activo: 'bg-green-100 text-green-700',
    completado: 'bg-gray-100 text-gray-600',
    cancelado: 'bg-red-100 text-red-700',
    no_presento: 'bg-red-100 text-red-700',
};

function NewStayModal({ spaces, rates, onClose }) {
    const { version } = usePage();
    const tz = useTenantTimezone();
    const [step, setStep] = useState(1);
    const [petSearch, setPetSearch] = useState('');
    const [petResults, setPetResults] = useState([]);
    const [selectedPet, setSelectedPet] = useState(null);
    const [memberships, setMemberships] = useState([]);
    const [spaceWarning, setSpaceWarning] = useState(null);
    const [registrarAdelanto, setRegistrarAdelanto] = useState(false);

    const form = useForm({
        pet_id: '',
        tipo: 'hotel',
        space_id: '',
        rate_id: '',
        fecha_entrada: dateKeyInTimezone(new Date(), tz),
        fecha_salida: '',
        notas: '',
        cobro_membresia: false,
        membership_id: '',
        adelanto_rate_id: '',
        adelanto_monto: '',
        adelanto_notas: '',
    });

    async function searchPet(q) {
        setPetSearch(q);
        if (q.length < 2) { setPetResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: q }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        const owners = r.data?.props?.owners?.data ?? [];
        const pets = owners.flatMap(o => (o.pets ?? []).map(p => ({ id: p.id, nombre: p.nombre, owner: o.nombre_completo })));
        setPetResults(pets.slice(0, 8));
    }

    async function selectPet(pet) {
        setSelectedPet(pet);
        setPetResults([]);
        form.setData('pet_id', pet.id);
        setMemberships([]);
        form.setData('cobro_membresia', false);
        form.setData('membership_id', '');

        try {
            const r = await axios.get(route('pets.show', pet.id), { headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
            setMemberships(r.data?.props?.activeMemberships ?? []);
        } catch (e) {
            if (e.response?.status === 409 && e.response.headers['x-inertia-location']) {
                window.location.href = e.response.headers['x-inertia-location'];
            }
        }
    }

    const membership = memberships.find(m => dateInRange(form.data.fecha_entrada, m.fecha_inicio, m.fecha_vencimiento)) ?? null;
    const credit = membership?.credits?.find(c => c.servicio_tipo === form.data.tipo);
    const hasCredits = credit && credit.saldo_actual > 0;
    const filteredRates = rates.filter(r => r.tipo === form.data.tipo);
    const selectedRate = filteredRates.find(r => String(r.id) === String(form.data.rate_id)) ?? null;

    const nochesEstimadas = form.data.fecha_entrada
        ? (form.data.fecha_salida
            ? Math.max(1, Math.round((toLocalDay(form.data.fecha_salida) - toLocalDay(form.data.fecha_entrada)) / 86400000))
            : 1)
        : 1;
    const creditosAReservar = form.data.cobro_membresia && credit ? Math.min(nochesEstimadas, credit.saldo_actual) : 0;
    const nochesACobrar = Math.max(0, nochesEstimadas - creditosAReservar);
    const montoEstimado = selectedRate
        ? (form.data.cobro_membresia ? nochesACobrar : nochesEstimadas) * selectedRate.precio
        : 0;

    useEffect(() => {
        form.setData('cobro_membresia', false);
    }, [membership?.id]);

    useEffect(() => {
        if (!form.data.space_id || !form.data.fecha_entrada) { setSpaceWarning(null); return; }
        let cancelled = false;
        axios.get(route('hotel.index'), {
            params: { fecha_disponibilidad: form.data.fecha_entrada },
            headers: { 'X-Inertia': true, 'X-Inertia-Version': version },
        }).then(r => {
            if (cancelled) return;
            const spacesAvail = r.data?.props?.availability?.spaces ?? [];
            const match = spacesAvail.find(s => String(s.id) === String(form.data.space_id));
            setSpaceWarning(match && match.capacidad && match.ocupacion >= match.capacidad ? match : null);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [form.data.space_id, form.data.fecha_entrada]);

    const adelantoRate = filteredRates.find(r => String(r.id) === String(form.data.adelanto_rate_id)) ?? null;
    const montoSugerido = adelantoRate
        ? (nochesACobrar * Number(adelantoRate.precio)).toFixed(2)
        : montoEstimado > 0 ? montoEstimado.toFixed(2) : '';

    useEffect(() => {
        if (registrarAdelanto && Number(montoSugerido) > 0) {
            form.setData('adelanto_monto', montoSugerido);
        }
    }, [registrarAdelanto, form.data.adelanto_rate_id]);

    function changeTipo(tipo) {
        form.setData('tipo', tipo);
        form.setData('rate_id', '');
        form.setData('cobro_membresia', false);
        form.setData('membership_id', '');
        form.setData('adelanto_rate_id', '');
        if (tipo === 'guarderia') form.setData('fecha_salida', '');
    }

    function toggleMembership(checked) {
        form.setData('cobro_membresia', checked);
        if (checked) form.setData('rate_id', '');
    }

    function goToStep2() {
        form.setData('adelanto_rate_id', form.data.rate_id || '');
        setStep(2);
    }

    function submit() {
        form.transform(data => ({
            ...data,
            rate_id: data.cobro_membresia ? '' : data.rate_id,
            membership_id: data.cobro_membresia ? (membership?.id ?? '') : '',
            adelanto_rate_id: registrarAdelanto ? data.adelanto_rate_id : '',
            adelanto_monto: registrarAdelanto ? data.adelanto_monto : '',
            adelanto_notas: registrarAdelanto ? data.adelanto_notas : '',
        }));
        form.post(route('hotel.store'), { onSuccess: onClose });
    }

    const step1Valid = !!form.data.pet_id && !!form.data.fecha_entrada;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-1">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold ${step === 1 ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}>1</span>
                    <span className="flex-1 border-t border-dashed border-zinc-200" />
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold ${step === 2 ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>2</span>
                </div>

                {step === 1 && (
                    <>
                        <h3 className="font-semibold text-zinc-800 text-sm">Nueva reserva — datos</h3>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Mascota *</label>
                            <div className="relative">
                                <input className="w-full border-gray-300 rounded-lg text-sm py-1.5" placeholder="Buscar mascota..." value={selectedPet ? selectedPet.nombre : petSearch} onChange={e => { setSelectedPet(null); searchPet(e.target.value); }} />
                                {petResults.length > 0 && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {petResults.map(p => (
                                            <button key={p.id} onClick={() => selectPet(p)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">
                                                <span className="font-medium">{p.nombre}</span>
                                                <span className="text-zinc-400 ml-2">{p.owner}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de servicio *</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.tipo} onChange={e => changeTipo(e.target.value)}>
                                <option value="hotel">Hotel</option>
                                <option value="guarderia">Guardería</option>
                            </select>
                        </div>

                        {form.data.tipo === 'guarderia' ? (
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha *</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.fecha_entrada} onChange={e => form.setData('fecha_entrada', e.target.value)} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Entrada *</label>
                                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.fecha_entrada} onChange={e => form.setData('fecha_entrada', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Salida estimada</label>
                                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.fecha_salida} onChange={e => form.setData('fecha_salida', e.target.value)} />
                                </div>
                            </div>
                        )}
                        {form.errors.fecha_entrada && <p className="text-red-500 text-xs -mt-2">{form.errors.fecha_entrada}</p>}

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Espacio</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.space_id} onChange={e => form.setData('space_id', e.target.value)}>
                                <option value="">Sin asignar</option>
                                {spaces.map(s => {
                                    const disponibles = s.capacidad ? Math.max(0, s.capacidad - s.ocupacion) : null;
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {s.nombre}{disponibles !== null ? ` (${disponibles}/${s.capacidad} disponibles)` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            {spaceWarning && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2 mt-1.5">
                                    Este espacio ya está lleno para esta fecha ({spaceWarning.ocupacion}/{spaceWarning.capacidad}). Puedes continuar de todas formas.
                                </p>
                            )}
                        </div>

                        {selectedPet && hasCredits && (
                            <label className="flex items-start gap-2 border rounded-lg p-2.5 bg-zinc-50 cursor-pointer">
                                <input type="checkbox" className="mt-0.5 rounded text-zinc-900" checked={form.data.cobro_membresia} onChange={e => toggleMembership(e.target.checked)} />
                                <span className="text-xs text-zinc-700">
                                    Usar crédito de membresía <span className="font-medium">{membership.plan?.nombre}</span>
                                    <span className="text-zinc-500 block">{credit.saldo_actual} crédito(s) de {tipoLabel[form.data.tipo].toLowerCase()} disponibles</span>
                                </span>
                            </label>
                        )}
                        {selectedPet && membership && !hasCredits && (
                            <p className="text-xs text-zinc-400">{selectedPet.nombre} no tiene créditos disponibles para {tipoLabel[form.data.tipo].toLowerCase()}.</p>
                        )}

                        {!form.data.cobro_membresia && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Tarifa</label>
                                <select className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.rate_id} onChange={e => form.setData('rate_id', e.target.value)}>
                                    <option value="">Sin tarifa (definir al check-out)</option>
                                    {filteredRates.map(r => <option key={r.id} value={r.id}>{r.nombre} — {fmt(r.precio)} / {r.cantidad} {r.unidad}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Notas</label>
                            <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button onClick={goToStep2} disabled={!step1Valid}
                                className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40">
                                Siguiente →
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h3 className="font-semibold text-zinc-800 text-sm">Nueva reserva — resumen y pago</h3>

                        {/* Cost summary */}
                        <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 space-y-1.5 text-xs">
                            <div className="flex justify-between text-zinc-600">
                                <span>{tipoLabel[form.data.tipo]} estimado(s)</span>
                                <span className="font-medium">{nochesEstimadas} {form.data.tipo === 'guarderia' ? 'día(s)' : 'noche(s)'}</span>
                            </div>
                            {form.data.cobro_membresia && creditosAReservar > 0 && (
                                <div className="flex justify-between text-zinc-700">
                                    <span>Cubierto por membresía</span>
                                    <span className="font-medium">-{creditosAReservar} crédito(s)</span>
                                </div>
                            )}
                            {form.data.cobro_membresia && nochesACobrar > 0 && (
                                <div className="flex justify-between text-zinc-600">
                                    <span>Sin cobertura</span>
                                    <span className="font-medium">{nochesACobrar} noche(s)</span>
                                </div>
                            )}
                            {selectedRate && (
                                <div className="flex justify-between text-zinc-600">
                                    <span>Tarifa: {selectedRate.nombre}</span>
                                    <span className="font-medium">{fmt(selectedRate.precio)} / {selectedRate.unidad}</span>
                                </div>
                            )}
                            <div className="border-t border-zinc-200 pt-1.5 flex justify-between font-semibold text-zinc-800">
                                <span>Estimado total</span>
                                <span>{montoEstimado > 0 ? fmt(montoEstimado) : <span className="text-zinc-400 font-normal">Sin tarifa definida</span>}</span>
                            </div>
                        </div>

                        {/* Adelanto toggle */}
                        <label className="flex items-start gap-2 border rounded-lg p-2.5 bg-zinc-50 cursor-pointer">
                            <input type="checkbox" className="mt-0.5 rounded text-zinc-900" checked={registrarAdelanto} onChange={e => {
                                setRegistrarAdelanto(e.target.checked);
                                if (!e.target.checked) {
                                    form.setData('adelanto_monto', '');
                                    form.setData('adelanto_notas', '');
                                }
                            }} />
                            <span className="text-xs text-zinc-700 font-medium">Registrar adelanto al crear la reserva</span>
                        </label>

                        {registrarAdelanto && (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tarifa para el adelanto</label>
                                    <select className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.adelanto_rate_id} onChange={e => form.setData('adelanto_rate_id', e.target.value)}>
                                        <option value="">Sin tarifa específica</option>
                                        {filteredRates.map(r => <option key={r.id} value={r.id}>{r.nombre} — {fmt(r.precio)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Monto del adelanto *</label>
                                    <input type="number" min="0.01" step="0.01"
                                        className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                        value={form.data.adelanto_monto}
                                        onChange={e => form.setData('adelanto_monto', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas del adelanto</label>
                                    <input type="text" className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                        placeholder="Ej. Pago en efectivo"
                                        value={form.data.adelanto_notas}
                                        onChange={e => form.setData('adelanto_notas', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {form.errors.adelanto_monto && <p className="text-red-500 text-xs">{form.errors.adelanto_monto}</p>}

                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setStep(1)} className="bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm px-4 font-medium hover:bg-zinc-50 transition-colors">← Atrás</button>
                            <button onClick={submit}
                                disabled={form.processing || (registrarAdelanto && !form.data.adelanto_monto)}
                                className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40">
                                {form.processing ? 'Creando...' : registrarAdelanto ? 'Crear reserva y cobrar en POS' : 'Crear reserva'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function availabilityStatus(ocupacion, capacidad) {
    if (!capacidad) return { dot: 'bg-zinc-300', text: 'text-zinc-400', label: 'Sin capacidad definida' };
    const ratio = ocupacion / capacidad;
    if (ratio >= 1) return { dot: 'bg-red-500', text: 'text-red-600', label: 'Lleno' };
    if (ratio >= 0.7) return { dot: 'bg-amber-400', text: 'text-amber-600', label: 'Casi lleno' };
    return { dot: 'bg-green-500', text: 'text-green-600', label: 'Disponible' };
}

function AvailabilityBoard({ availability, onChangeFecha }) {
    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-700 text-sm">Disponibilidad de espacios</h3>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500">Fecha</label>
                    <input type="date" className="border-gray-300 rounded-lg text-sm py-1"
                        value={availability.fecha} onChange={e => onChangeFecha(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availability.spaces.map(s => {
                    const { dot, text, label } = availabilityStatus(s.ocupacion, s.capacidad);
                    return (
                        <div key={s.id} className="border rounded-lg p-3 flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-800 truncate">{s.nombre}</p>
                                <p className={`text-xs ${text}`}>
                                    {s.capacidad ? `${s.ocupacion}/${s.capacidad} ocupados — ${label}` : label}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {availability.spaces.length === 0 && (
                    <p className="text-sm text-zinc-400 col-span-full text-center py-4">Sin espacios configurados.</p>
                )}
            </div>
        </div>
    );
}

function OverdueCheckoutsAlert({ overdueCheckouts }) {
    const tz = useTenantTimezone();
    if (!overdueCheckouts || overdueCheckouts.length === 0) return null;

    return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-red-700 mb-2">
                ⚠ {overdueCheckouts.length} {overdueCheckouts.length === 1 ? 'estancia tiene' : 'estancias tienen'} salida programada vencida sin check-out
            </p>
            <ul className="space-y-1.5">
                {overdueCheckouts.map(s => (
                    <li key={s.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-red-100">
                        <div>
                            <span className="font-medium text-zinc-800">{s.pet}</span>
                            <span className="text-zinc-400 text-xs ml-1.5">{s.owner}</span>
                            <span className="text-red-600 text-xs ml-2">— salida programada: {formatDate(s.fecha_salida, tz)}</span>
                        </div>
                        <Link href={route('hotel.show', s.id)} className="text-xs text-zinc-700 underline-offset-2 hover:underline font-medium shrink-0 ml-3">
                            Hacer check-out / modificar →
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function HotelIndex({ stays, spaces, rates, filters, availability, overdueCheckouts }) {
    const tz = useTenantTimezone();
    const [showNew, setShowNew] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [earlyCheckinStay, setEarlyCheckinStay] = useState(null);

    function updateFilters(overrides) {
        router.get(route('hotel.index'), {
            search: filters.search ?? '',
            estado: filters.estado ?? '',
            tipo: filters.tipo ?? '',
            space_id: filters.space_id ?? '',
            fecha_disponibilidad: filters.fecha_disponibilidad ?? '',
            ...overrides,
        }, { preserveState: true, replace: true });
    }

    function doSearch(e) {
        e.preventDefault();
        updateFilters({ search });
    }

    function changeFechaDisponibilidad(fecha) {
        updateFilters({ fecha_disponibilidad: fecha });
    }

    function checkin(stay) {
        if (!isSameDayInTimezone(stay.fecha_entrada, new Date(), tz)) {
            setEarlyCheckinStay(stay);
            return;
        }
        router.post(route('hotel.checkin', stay.id), {}, { preserveScroll: true });
    }

    return (
        <TenantLayout title="Hotel / Guardería">
            <div className="flex justify-between mb-5">
                <Link href={route('hotel.config')} className="bg-white border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium transition-colors">
                    Espacios y tarifas →
                </Link>
                <button onClick={() => setShowNew(true)} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                    + Nueva reserva
                </button>
            </div>

            <OverdueCheckoutsAlert overdueCheckouts={overdueCheckouts} />

            <AvailabilityBoard availability={availability} onChangeFecha={changeFechaDisponibilidad} />

            <div className="flex flex-col lg:flex-row gap-3 mb-4">
                <form onSubmit={doSearch} className="flex gap-2 flex-1">
                    <input
                        className="flex-1 border-gray-300 rounded-lg text-sm"
                        placeholder="Buscar por nombre, celular o mascota..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Buscar</button>
                </form>

                <select className="border-gray-300 rounded-lg text-sm" value={filters.estado ?? ''} onChange={e => updateFilters({ estado: e.target.value })}>
                    <option value="">Todos los estados</option>
                    {Object.entries(estadoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>

                <select className="border-gray-300 rounded-lg text-sm" value={filters.tipo ?? ''} onChange={e => updateFilters({ tipo: e.target.value })}>
                    <option value="">Hotel y guardería</option>
                    <option value="hotel">Solo hotel</option>
                    <option value="guarderia">Solo guardería</option>
                </select>

                <select className="border-gray-300 rounded-lg text-sm" value={filters.space_id ?? ''} onChange={e => updateFilters({ space_id: e.target.value })}>
                    <option value="">Todos los espacios</option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
            </div>

            {showNew && <NewStayModal spaces={spaces} rates={rates} onClose={() => setShowNew(false)} />}
            {earlyCheckinStay && <EarlyCheckinModal stay={earlyCheckinStay} onClose={() => setEarlyCheckinStay(null)} />}

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-3 text-left">Mascota / Dueño</th>
                            <th className="px-4 py-3 text-left">Tipo</th>
                            <th className="px-4 py-3 text-left">Espacio</th>
                            <th className="px-4 py-3 text-left">Fechas</th>
                            <th className="px-4 py-3 text-left">Estado</th>
                            <th className="px-4 py-3 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {stays.data.map(s => (
                            <tr key={s.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-3">
                                    <Link href={route('hotel.show', s.id)} className="font-medium text-zinc-900 hover:underline">
                                        {s.pet}
                                    </Link>
                                    <div className="text-xs text-zinc-400">{s.owner}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[s.tipo]}`}>{tipoLabel[s.tipo]}</span>
                                </td>
                                <td className="px-4 py-3 text-zinc-600">{s.space ?? '—'}</td>
                                <td className="px-4 py-3 text-zinc-600 text-xs">
                                    {formatDate(s.fecha_entrada, tz)} → {formatDate(s.fecha_salida, tz)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[s.estado]}`}>{estadoLabel[s.estado]}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {s.estado === 'reservado' && (
                                            <button onClick={() => checkin(s)} className="text-xs text-zinc-700 underline-offset-2 hover:underline font-medium">Check-in</button>
                                        )}
                                        <Link href={route('hotel.show', s.id)} className="text-xs text-zinc-500 hover:text-zinc-700">Ver →</Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {stays.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">Sin reservas registradas.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </TenantLayout>
    );
}
