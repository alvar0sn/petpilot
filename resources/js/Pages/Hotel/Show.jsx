import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { dateKeyInTimezone, formatDate, isSameDayInTimezone, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function isOverdueCheckout(stay, timeZone) {
    if (stay.estado !== 'activo' || !stay.fecha_salida) return false;
    return dateKeyInTimezone(stay.fecha_salida, timeZone) < dateKeyInTimezone(new Date(), timeZone);
}

function CheckinModal({ stay, checkoutRates, onClose }) {
    const tz = useTenantTimezone();
    const isEarly = !isSameDayInTimezone(stay.fecha_entrada, new Date(), tz);

    const nochesEstimadas = stay.fecha_salida
        ? Math.max(1, Math.round((new Date(stay.fecha_salida.slice(0, 10)) - new Date(stay.fecha_entrada.slice(0, 10))) / 86400000))
        : 1;
    const creditosReservados = stay.creditos_consumidos ?? 0;
    const nochesACobrar = Math.max(0, nochesEstimadas - creditosReservados);

    const defaultRateId = stay.rate_id ? String(stay.rate_id) : (checkoutRates[0]?.id ? String(checkoutRates[0].id) : '');
    const [withPayment, setWithPayment] = useState(false);

    const form = useForm({
        checkout_rate_id: defaultRateId,
        monto: '',
        notas: '',
    });

    const selectedRate = checkoutRates.find(r => String(r.id) === form.data.checkout_rate_id) ?? null;
    const montoSugerido = selectedRate ? (nochesACobrar * Number(selectedRate.precio)).toFixed(2) : '0';

    useEffect(() => {
        if (withPayment && selectedRate) {
            form.setData('monto', montoSugerido);
        }
    }, [withPayment, form.data.checkout_rate_id]);

    function submit() {
        if (isEarly) return;
        const payload = withPayment
            ? form.data
            : { checkout_rate_id: null, monto: null, notas: null };
        form.transform(() => payload);
        form.post(route('hotel.checkin', stay.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
                <h3 className="font-semibold text-zinc-800">Check-in — {stay.pet?.nombre}</h3>

                {isEarly ? (
                    <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                            La entrada está programada para el <span className="font-medium">{formatDate(stay.fecha_entrada, tz)}</span>. El check-in solo se puede hacer el día de entrada. Si la mascota ya llegó, ajusta primero la fecha en la ficha.
                        </div>
                        <button onClick={onClose} className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Entendido</button>
                    </>
                ) : (
                    <>
                        {/* Resumen estimado */}
                        <div className="bg-zinc-50 rounded-lg p-3 text-sm divide-y divide-zinc-200">
                            <div className="flex justify-between py-1.5">
                                <span className="text-zinc-500">Noches estimadas</span>
                                <span className="font-semibold">{nochesEstimadas}{!stay.fecha_salida && <span className="text-zinc-400 font-normal"> (sin fecha de salida)</span>}</span>
                            </div>
                            {creditosReservados > 0 && (
                                <div className="flex justify-between py-1.5 text-green-700">
                                    <span>Cubiertas por membresía</span>
                                    <span className="font-semibold">{creditosReservados} noche{creditosReservados !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                            {nochesACobrar > 0 && selectedRate && (
                                <div className="flex justify-between py-1.5 text-zinc-700">
                                    <span>Estimado a cobrar</span>
                                    <span className="font-semibold">{fmt(montoSugerido)}</span>
                                </div>
                            )}
                        </div>

                        {/* Toggle pago */}
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" className="rounded text-zinc-900"
                                checked={withPayment}
                                onChange={e => setWithPayment(e.target.checked)} />
                            <span className="font-medium text-zinc-700">Registrar adelanto al hacer check-in</span>
                        </label>

                        {withPayment && (
                            <div className="space-y-3 border border-zinc-100 bg-zinc-50 rounded-lg p-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tarifa</label>
                                    {checkoutRates.length > 0 ? (
                                        <select
                                            className="w-full border-gray-300 rounded-lg text-sm bg-white"
                                            value={form.data.checkout_rate_id}
                                            onChange={e => form.setData('checkout_rate_id', e.target.value)}
                                        >
                                            {checkoutRates.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.nombre} — {fmt(r.precio)}/{r.unidad === 'horas' ? 'hora' : 'noche'}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-amber-700">Sin tarifas activas. Configúralas en Hotel → Configuración.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Monto del adelanto (ajustable)</label>
                                    <input type="number" step="0.01" min="0"
                                        className="w-full border-gray-300 rounded-lg text-sm font-mono bg-white"
                                        value={form.data.monto}
                                        onChange={e => form.setData('monto', e.target.value)} />
                                    {form.errors.monto && <p className="text-red-500 text-xs mt-1">{form.errors.monto}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas (opcional)</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm bg-white"
                                        placeholder="Ej: Adelanto 50%..."
                                        value={form.data.notas}
                                        onChange={e => form.setData('notas', e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={submit} disabled={form.processing}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors ${
                                    withPayment ? 'bg-zinc-900 hover:bg-zinc-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}>
                                {form.processing ? 'Procesando...' : withPayment ? 'Check-in y cobrar en POS' : 'Confirmar check-in'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function PaymentModal({ stay, checkoutRates, saldoPendiente, onClose }) {
    const form = useForm({
        checkout_rate_id: stay.rate_id ? String(stay.rate_id) : (checkoutRates[0]?.id ? String(checkoutRates[0].id) : ''),
        monto: saldoPendiente > 0 ? String(saldoPendiente.toFixed(2)) : '',
        notas: '',
    });

    function submit() {
        form.post(route('hotel.payments.store', stay.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="font-semibold text-zinc-800">Registrar abono — {stay.pet?.nombre}</h3>

                {saldoPendiente > 0 && (
                    <p className="text-sm text-zinc-500">Saldo pendiente estimado: <span className="font-semibold text-zinc-800">{fmt(saldoPendiente)}</span></p>
                )}

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tarifa de referencia</label>
                    {checkoutRates.length > 0 ? (
                        <select className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.checkout_rate_id}
                            onChange={e => form.setData('checkout_rate_id', e.target.value)}>
                            {checkoutRates.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre} — {fmt(r.precio)}/{r.unidad === 'horas' ? 'hora' : 'noche'}</option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-xs text-amber-700">Sin tarifas activas.</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Monto del abono *</label>
                    <input type="number" step="0.01" min="0.01"
                        className="w-full border-gray-300 rounded-lg text-sm font-mono"
                        value={form.data.monto}
                        onChange={e => form.setData('monto', e.target.value)} />
                    {form.errors.monto && <p className="text-red-500 text-xs mt-1">{form.errors.monto}</p>}
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Notas (opcional)</label>
                    <input className="w-full border-gray-300 rounded-lg text-sm"
                        placeholder="Ej: Pago parcial..."
                        value={form.data.notas}
                        onChange={e => form.setData('notas', e.target.value)} />
                </div>

                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">Cancelar</button>
                    <button onClick={submit} disabled={form.processing}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors">
                        {form.processing ? 'Procesando...' : 'Cobrar en POS'}
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

function CheckoutModal({ stay, checkoutRates, totalPagado, saldoPendiente, onClose }) {
    const tz = useTenantTimezone();
    const willUseMembership = stay.cobro_membresia && stay.membership_id;
    const credit = willUseMembership ? stay.membership?.credits?.find(c => c.servicio_tipo === stay.tipo) : null;
    const creditosYaReservados = stay.creditos_consumidos ?? 0;
    const creditosDisponibles = (credit?.saldo_actual ?? 0) + creditosYaReservados;

    const defaultRateId = stay.rate_id ? String(stay.rate_id) : (checkoutRates[0]?.id ? String(checkoutRates[0].id) : '');

    const form = useForm({
        checkout_rate_id: defaultRateId,
        monto: '0',
        fecha_salida: dateKeyInTimezone(new Date(), tz),
    });

    const noches = Math.max(1, Math.round(
        (new Date(form.data.fecha_salida) - new Date(stay.fecha_entrada.slice(0, 10))) / 86400000
    ));
    const creditosAUsar = willUseMembership ? Math.min(noches, creditosDisponibles) : 0;
    const nochesExtra = noches - creditosAUsar;
    const hayQueCobrar = !willUseMembership || nochesExtra > 0;

    const selectedRate = checkoutRates.find(r => String(r.id) === form.data.checkout_rate_id) ?? null;
    const unidadLabel = selectedRate?.unidad === 'horas' ? 'hora(s)' : 'noche(s)';

    function recalcMonto(fecha, rateId) {
        const rate = checkoutRates.find(r => String(r.id) === rateId) ?? null;
        if (!rate) return;
        const n = Math.max(1, Math.round(
            (new Date(fecha) - new Date(stay.fecha_entrada.slice(0, 10))) / 86400000
        ));
        const credUsed = willUseMembership ? Math.min(n, creditosDisponibles) : 0;
        const extra = n - credUsed;
        const unidades = willUseMembership ? extra : n;
        const bruto = unidades > 0 ? unidades * Number(rate.precio) : 0;
        const neto = Math.max(0, bruto - (totalPagado ?? 0));
        form.setData({ ...form.data, fecha_salida: fecha, checkout_rate_id: rateId, monto: neto.toFixed(2) });
    }

    useEffect(() => {
        recalcMonto(form.data.fecha_salida, form.data.checkout_rate_id);
    }, []);

    function submit() {
        form.post(route('hotel.checkout', stay.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
                <h3 className="font-semibold text-zinc-800">Check-out — {stay.pet?.nombre}</h3>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha de salida *</label>
                        <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.fecha_salida}
                            onChange={e => recalcMonto(e.target.value, form.data.checkout_rate_id)} />
                        {form.errors.fecha_salida && <p className="text-red-500 text-xs mt-1">{form.errors.fecha_salida}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Total de noches</label>
                        <div className="mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-700">
                            {noches} noche{noches !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* Resumen membresía */}
                {willUseMembership && (
                    <div className="bg-zinc-50 rounded-lg p-3 text-sm divide-y divide-zinc-200">
                        {creditosAUsar > 0 && (
                            <div className="flex justify-between py-1.5 text-green-700">
                                <span>Cubiertas por membresía ({stay.membership?.plan?.nombre})</span>
                                <span className="font-semibold">{creditosAUsar} noche{creditosAUsar !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {nochesExtra > 0 ? (
                            <div className="flex justify-between py-1.5 text-amber-700">
                                <span>Sin cobertura — a cobrar</span>
                                <span className="font-semibold">{nochesExtra} noche{nochesExtra !== 1 ? 's' : ''}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between py-1.5 text-green-700 font-semibold">
                                <span>Cubierto completamente por membresía</span>
                                <span>$0</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Selector de tarifa + cálculo */}
                {hayQueCobrar && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Tarifa a aplicar *</label>
                            {checkoutRates.length > 0 ? (
                                <select
                                    className="w-full border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
                                    value={form.data.checkout_rate_id}
                                    onChange={e => recalcMonto(form.data.fecha_salida, e.target.value)}
                                >
                                    {checkoutRates.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.nombre} — {fmt(r.precio)}/{r.unidad === 'horas' ? 'hora' : 'noche'}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                                    No hay tarifas activas para este tipo. Configura las tarifas en Hotel → Configuración.
                                </p>
                            )}
                            {form.errors.checkout_rate_id && <p className="text-red-500 text-xs mt-1">{form.errors.checkout_rate_id}</p>}
                        </div>

                        {selectedRate && (
                            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 text-sm space-y-1">
                                <div className="flex justify-between text-zinc-600">
                                    <span>{nochesExtra} {unidadLabel} × {fmt(selectedRate.precio)}</span>
                                    <span className="font-semibold text-zinc-700">{fmt(nochesExtra * selectedRate.precio)}</span>
                                </div>
                                {(totalPagado ?? 0) > 0 && (
                                    <div className="flex justify-between text-green-700 text-xs">
                                        <span>Ya pagado (adelantos/abonos)</span>
                                        <span className="font-semibold">− {fmt(totalPagado)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Saldo a cobrar hoy (ajustable)</label>
                            <input type="number" step="0.01" min="0"
                                className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                value={form.data.monto}
                                onChange={e => form.setData('monto', e.target.value)} />
                            {form.errors.monto && <p className="text-red-500 text-xs mt-1">{form.errors.monto}</p>}
                            <p className="text-xs text-zinc-400 mt-1">
                                {nochesExtra} {unidadLabel} × {fmt(selectedRate?.precio ?? 0)}{(totalPagado ?? 0) > 0 ? ` − ${fmt(totalPagado)} ya pagado` : ''}. Ajusta si aplica descuento.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={submit} disabled={form.processing}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors ${
                            hayQueCobrar
                                ? 'bg-zinc-900 hover:bg-zinc-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}>
                        {form.processing
                            ? 'Procesando...'
                            : hayQueCobrar ? 'Confirmar y cobrar en POS' : 'Confirmar check-out'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CancelModal({ stay, onClose }) {
    const form = useForm({ motivo_cancelacion: '' });

    function submit() {
        form.post(route('hotel.cancel', stay.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="font-semibold text-zinc-800">Cancelar reserva</h3>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Motivo de la cancelación *</label>
                    <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={3} value={form.data.motivo_cancelacion} onChange={e => form.setData('motivo_cancelacion', e.target.value)} />
                    {form.errors.motivo_cancelacion && <p className="text-red-500 text-xs mt-1">{form.errors.motivo_cancelacion}</p>}
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">Volver</button>
                    <button onClick={submit} disabled={form.processing}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40">
                        {form.processing ? 'Cancelando...' : 'Confirmar cancelación'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CareForm({ stay, spaces }) {
    const form = useForm({
        space_id: stay.space_id ?? '',
        fecha_entrada: stay.fecha_entrada?.slice(0, 10) ?? '',
        fecha_salida: stay.fecha_salida?.slice(0, 10) ?? '',
        alimentacion: stay.alimentacion ?? '',
        medicacion: stay.medicacion ?? '',
        notas: stay.notas ?? '',
        estado_fisico: stay.estado_fisico,
        nota_lesion: stay.nota_lesion ?? '',
        objetos_recibidos: stay.objetos_recibidos ?? '',
    });

    function submit(e) {
        e.preventDefault();
        form.put(route('hotel.update', stay.id), { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-zinc-700">Ficha de estancia</h3>

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Espacio</label>
                <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.space_id} onChange={e => form.setData('space_id', e.target.value)}>
                    <option value="">Sin asignar</option>
                    {spaces.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}{s.capacidad ? ` (capacidad ${s.capacidad})` : ''}</option>
                    ))}
                </select>
                {form.errors.space_id && <p className="text-red-500 text-xs mt-1">{form.errors.space_id}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha de entrada *</label>
                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={form.data.fecha_entrada} onChange={e => form.setData('fecha_entrada', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha de salida</label>
                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={form.data.fecha_salida} onChange={e => form.setData('fecha_salida', e.target.value)} />
                </div>
            </div>
            {form.errors.fecha_entrada && <p className="text-red-500 text-xs">{form.errors.fecha_entrada}</p>}

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Alimentación</label>
                <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.alimentacion} onChange={e => form.setData('alimentacion', e.target.value)} placeholder="Horarios, cantidades, marca de alimento..." />
            </div>

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Medicación</label>
                <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.medicacion} onChange={e => form.setData('medicacion', e.target.value)} placeholder="Medicamentos, dosis, horarios..." />
            </div>

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Estado físico</label>
                <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                        <input type="radio" name="estado_fisico" checked={form.data.estado_fisico === 'ok'} onChange={() => form.setData('estado_fisico', 'ok')} className="text-zinc-900" />
                        Sin novedad
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                        <input type="radio" name="estado_fisico" checked={form.data.estado_fisico === 'lesion'} onChange={() => form.setData('estado_fisico', 'lesion')} className="text-zinc-900" />
                        Lesión / novedad
                    </label>
                </div>
                {form.data.estado_fisico === 'lesion' && (
                    <textarea className="w-full border-gray-300 rounded-lg text-sm mt-2" rows={2} value={form.data.nota_lesion} onChange={e => form.setData('nota_lesion', e.target.value)} placeholder="Describe la lesión o novedad..." />
                )}
            </div>

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Objetos recibidos</label>
                <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.objetos_recibidos} onChange={e => form.setData('objetos_recibidos', e.target.value)} placeholder="Correa, juguetes, cobija, alimento..." />
            </div>

            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notas generales</label>
                <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
            </div>

            <button type="submit" disabled={form.processing}
                className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {form.processing ? 'Guardando...' : 'Guardar ficha'}
            </button>
        </form>
    );
}

function PhotoGallery({ stay }) {
    const form = useForm({ foto: null, etiqueta: '' });
    const [preview, setPreview] = useState(null);
    const photos = stay.photos ?? [];

    function selectFile(e) {
        const file = e.target.files[0] ?? null;
        form.setData('foto', file);
        setPreview(file ? URL.createObjectURL(file) : null);
    }

    function submit(e) {
        e.preventDefault();
        form.post(route('hotel.photos.store', stay.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setPreview(null);
            },
        });
    }

    function destroy(photoId) {
        if (!confirm('¿Eliminar esta foto?')) return;
        router.delete(route('hotel.photos.destroy', [stay.id, photoId]), { preserveScroll: true });
    }

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-zinc-700">Fotos — perro, juguetes o accesorios</h3>

            {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {photos.map(p => (
                        <div key={p.id} className="relative group">
                            <img src={p.url} alt={p.etiqueta ?? 'Foto de la estancia'} className="w-full h-24 object-cover rounded-lg border" />
                            {p.etiqueta && <p className="text-xs text-zinc-400 mt-0.5 truncate">{p.etiqueta}</p>}
                            <button type="button" onClick={() => destroy(p.id)} title="Eliminar foto"
                                className="absolute top-1 right-1 bg-black/50 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {photos.length < 3 ? (
                <form onSubmit={submit} className="space-y-2 border-t pt-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Agregar foto ({photos.length}/3)</label>
                        <input type="file" accept="image/*" className="w-full text-xs" onChange={selectFile} />
                        {form.errors.foto && <p className="text-red-500 text-xs mt-1">{form.errors.foto}</p>}
                    </div>
                    {preview && <img src={preview} alt="Vista previa" className="w-20 h-20 object-cover rounded-lg border" />}
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Descripción (opcional)</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm py-1.5" placeholder="Ej: Juguete favorito, correa, cobija..." value={form.data.etiqueta} onChange={e => form.setData('etiqueta', e.target.value)} />
                    </div>
                    <button type="submit" disabled={!form.data.foto || form.processing}
                        className="w-full bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                        {form.processing ? 'Subiendo...' : 'Agregar foto'}
                    </button>
                </form>
            ) : (
                <p className="text-xs text-zinc-400 border-t pt-3">Se alcanzó el máximo de 3 fotos para esta estancia.</p>
            )}
        </div>
    );
}

export default function HotelShow({ stay, spaces, checkoutRates }) {
    const tz = useTenantTimezone();
    const [showCheckin, setShowCheckin] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

    // Cálculo financiero estimado
    const nochesEstimadas = stay.fecha_salida
        ? Math.max(1, Math.round((new Date(stay.fecha_salida.slice(0, 10)) - new Date(stay.fecha_entrada.slice(0, 10))) / 86400000))
        : null;
    const creditosReservados = stay.creditos_consumidos ?? 0;
    const nochesACobrar = nochesEstimadas !== null ? Math.max(0, nochesEstimadas - creditosReservados) : null;
    const montoEstimado = nochesACobrar !== null && stay.precio_por_noche ? nochesACobrar * Number(stay.precio_por_noche) : null;
    const totalPagado = (stay.payments ?? []).reduce((sum, p) => sum + Number(p.monto), 0);
    const saldoPendiente = montoEstimado !== null ? Math.max(0, montoEstimado - totalPagado) : null;

    return (
        <TenantLayout title={`Estancia de ${stay.pet?.nombre ?? ''}`}>
            <div className="mb-4">
                <Link href={route('hotel.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Hotel / Guardería</Link>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">{stay.pet?.nombre}</h2>
                        <p className="text-sm text-zinc-500">{stay.pet?.owner?.nombre_completo} · {stay.pet?.owner?.telefono}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[stay.tipo]}`}>{tipoLabel[stay.tipo]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[stay.estado]}`}>{estadoLabel[stay.estado]}</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                        <p className="text-xs text-zinc-400">Espacio</p>
                        <p className="text-zinc-700">{stay.space?.nombre ?? 'Sin asignar'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400">Entrada</p>
                        <p className="text-zinc-700">{formatDate(stay.fecha_entrada, tz)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400">Salida {stay.estado === 'completado' ? '' : '(estimada)'}</p>
                        <p className="text-zinc-700">{formatDate(stay.fecha_salida, tz)}</p>
                    </div>
                </div>

                {isOverdueCheckout(stay, tz) && (
                    <div className="mt-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg p-3">
                        ⚠ La salida estaba programada para el <span className="font-medium">{formatDate(stay.fecha_salida, tz)}</span> y aún no se ha hecho check-out. Haz el check-out o ajusta la fecha de salida en la ficha.
                    </div>
                )}

                {stay.estado === 'cancelado' && stay.motivo_cancelacion && (
                    <div className="mt-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg p-3">
                        <span className="font-medium">Motivo de cancelación:</span> {stay.motivo_cancelacion}
                    </div>
                )}

                <div className="flex gap-2 mt-4 flex-wrap">
                    {stay.estado === 'reservado' && (
                        <button onClick={() => setShowCheckin(true)}
                            className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                            Check-in
                        </button>
                    )}
                    {stay.estado === 'activo' && (
                        <>
                            <button onClick={() => setShowCheckout(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                                Check-out
                            </button>
                            <button onClick={() => setShowPayment(true)} className="bg-white border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                                Registrar abono
                            </button>
                        </>
                    )}
                    {(stay.estado === 'reservado' || stay.estado === 'activo') && (
                        <button onClick={() => setShowCancel(true)} className="border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                            Cancelar reserva
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <CareForm stay={stay} spaces={spaces} />
                    <PhotoGallery stay={stay} />
                </div>

                <div className="space-y-4">
                    {/* Resumen financiero */}
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 text-sm space-y-2">
                        <h3 className="font-semibold text-zinc-700 mb-1">Cobro</h3>

                        <div className="flex justify-between">
                            <span className="text-zinc-500">Tarifa base</span>
                            <span className="text-zinc-700">{stay.rate?.nombre ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Precio / noche</span>
                            <span className="font-mono text-zinc-700">{stay.precio_por_noche ? fmt(stay.precio_por_noche) : '—'}</span>
                        </div>
                        {stay.cobro_membresia && stay.membership && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Membresía</span>
                                <span className="text-zinc-700">{stay.membership.plan?.nombre}</span>
                            </div>
                        )}
                        {creditosReservados > 0 && (
                            <div className="flex justify-between text-green-700">
                                <span>Cubiertas por membresía</span>
                                <span className="font-semibold">{creditosReservados} noche{creditosReservados !== 1 ? 's' : ''}</span>
                            </div>
                        )}

                        {montoEstimado !== null && (
                            <div className="border-t pt-2 mt-1 space-y-1.5">
                                <div className="flex justify-between text-zinc-600">
                                    <span>Total estimado</span>
                                    <span className="font-mono">{fmt(montoEstimado)}</span>
                                </div>
                                {totalPagado > 0 && (
                                    <div className="flex justify-between text-green-700">
                                        <span>Total pagado</span>
                                        <span className="font-mono font-semibold">{fmt(totalPagado)}</span>
                                    </div>
                                )}
                                <div className={`flex justify-between font-semibold ${saldoPendiente > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                                    <span>{saldoPendiente > 0 ? 'Saldo pendiente' : 'Pagado completo'}</span>
                                    <span className="font-mono">{fmt(saldoPendiente)}</span>
                                </div>
                            </div>
                        )}

                        {/* Historial de pagos */}
                        {(stay.payments ?? []).length > 0 && (
                            <div className="border-t pt-2 mt-1 space-y-1.5">
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Pagos registrados</p>
                                {stay.payments.map(p => (
                                    <div key={p.id} className="flex items-center justify-between gap-2">
                                        <div>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.tipo === 'adelanto' ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' : 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200'}`}>
                                                {p.tipo}
                                            </span>
                                            {p.notas && <span className="text-xs text-zinc-400 ml-1">{p.notas}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono text-zinc-700">{fmt(p.monto)}</span>
                                            {p.ticket && (
                                                <span className="text-xs text-zinc-400">#{p.ticket.folio}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {stay.ticket && (
                            <div className="border-t pt-2 flex justify-between">
                                <span className="text-zinc-500">Ticket final POS</span>
                                <span className="font-mono text-zinc-700">#{stay.ticket.folio} · {fmt(stay.ticket.total)}</span>
                            </div>
                        )}
                    </div>

                    {stay.createdBy && (
                        <p className="text-xs text-zinc-400">Reserva creada por {stay.createdBy.nombre} {stay.createdBy.apellido}</p>
                    )}
                </div>
            </div>

            {showCheckin && <CheckinModal stay={stay} checkoutRates={checkoutRates ?? []} onClose={() => setShowCheckin(false)} />}
            {showCheckout && <CheckoutModal stay={stay} checkoutRates={checkoutRates ?? []} totalPagado={totalPagado} saldoPendiente={saldoPendiente} onClose={() => setShowCheckout(false)} />}
            {showPayment && <PaymentModal stay={stay} checkoutRates={checkoutRates ?? []} saldoPendiente={saldoPendiente ?? 0} onClose={() => setShowPayment(false)} />}
            {showCancel && <CancelModal stay={stay} onClose={() => setShowCancel(false)} />}
        </TenantLayout>
    );
}
