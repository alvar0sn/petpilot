import AppointmentTimePicker from '@/Components/AppointmentTimePicker';
import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function fmtNac(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${meses[m - 1]} ${y}`;
}

function calcEdad(fechaNac) {
    if (!fechaNac) return null;
    const [y, m] = fechaNac.split('-').map(Number);
    const now = new Date();
    let years = now.getFullYear() - y;
    let months = now.getMonth() + 1 - m;
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} año${years !== 1 ? 's' : ''}`;
    if (months > 0) return `${months} mes${months !== 1 ? 'es' : ''}`;
    return 'recién nacido';
}

const agresividadConfig = {
    tranquilo:  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'tranquilo' },
    precaucion: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       label: 'precaución' },
    agresivo:   { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',           label: 'agresivo'   },
};

const estadoBadge = {
    pendiente:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    confirmada: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    completada: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelada:  'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
    no_show:    'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
};
const estadoLabel = {
    pendiente:  'Pendiente',
    confirmada: 'Confirmada',
    completada: 'Completada',
    cancelada:  'Cancelada',
    no_show:    'No se presentó',
};

export default function TrainingShow({ appointment, entrenadores, catalogItems }) {
    const appt = appointment;
    const canEdit = ['pendiente', 'confirmada'].includes(appt.estado);

    const form = useForm({
        fecha: appt.fecha,
        hora_inicio: appt.hora_inicio ?? '',
        hora_fin: appt.hora_fin ?? '',
        entrenador_id: appt.entrenador?.id ?? '',
        notas_internas: appt.notas_internas ?? '',
    });
    const [editing, setEditing] = useState(false);

    function inferDuracion(hi, hf) {
        if (!hi || !hf) return null;
        const [hh, hm] = hi.split(':').map(Number);
        const [fh, fm] = hf.split(':').map(Number);
        const diff = (fh * 60 + fm) - (hh * 60 + hm);
        return diff > 0 ? diff : null;
    }
    const [duracion, setDuracion] = useState(() => inferDuracion(appt.hora_inicio, appt.hora_fin));
    function saveEdit(e) { e.preventDefault(); form.put(route('training.update', appt.id), { onSuccess: () => setEditing(false) }); }
    function doAction(routeName) { router.post(route(routeName, appt.id)); }

    // Cargos (sección independiente, comparte payload con update())
    const chargesForm = useForm({
        items: (appt.items ?? []).map(i => ({
            catalog_item_id: i.catalog_item_id ?? '',
            nombre:          i.nombre,
            precio:          String(i.precio),
            cantidad:        String(i.cantidad ?? 1),
        })),
    });
    const [itemDraft, setItemDraft] = useState({ catalog_item_id: '', nombre: '', precio: '', cantidad: '1' });
    function pickCatalogItem(e) {
        const id = e.target.value;
        const found = catalogItems.find(c => String(c.id) === id);
        setItemDraft(d => ({
            ...d,
            catalog_item_id: id,
            nombre:   found?.nombre ?? (id ? d.nombre : ''),
            precio:   found ? String(found.precio) : (id ? d.precio : ''),
            cantidad: '1',
        }));
    }
    function addCharge() {
        if (!itemDraft.nombre || itemDraft.precio === '') return;
        chargesForm.setData('items', [...chargesForm.data.items, { ...itemDraft, cantidad: parseFloat(itemDraft.cantidad) || 1 }]);
        setItemDraft({ catalog_item_id: '', nombre: '', precio: '', cantidad: '1' });
    }
    function removeCharge(idx) { chargesForm.setData('items', chargesForm.data.items.filter((_, i) => i !== idx)); }
    function saveCharges(e) { e.preventDefault(); chargesForm.put(route('training.items', appt.id)); }
    const totalCargos = chargesForm.data.items.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);
    const [cargosOpen, setCargosOpen] = useState(chargesForm.data.items.length > 0 || canEdit);

    const completeForm = useForm({ notas_resultado: appt.notas_resultado ?? '' });
    function doComplete(e) { e.preventDefault(); completeForm.post(route('training.complete', appt.id)); }
    const [salidaOpen, setSalidaOpen] = useState(!!completeForm.data.notas_resultado || appt.estado === 'completada');
    const [petInfoOpen, setPetInfoOpen] = useState(false);

    return (
        <TenantLayout title="Clase de Entrenamiento">
            <div className="mb-4">
                <Link href={route('training.index', { week_start: appt.fecha })} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                    ← Volver al calendario
                </Link>
            </div>

            {/* Header */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-semibold text-zinc-900">
                                <Link href={route('pets.show', appt.pet?.id)} className="hover:underline">
                                    {appt.pet?.nombre}
                                </Link>
                            </h1>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoBadge[appt.estado] ?? 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200'}`}>
                                {estadoLabel[appt.estado] ?? appt.estado}
                            </span>
                            {appt.pet?.nivel_agresividad && (() => {
                                const cfg = agresividadConfig[appt.pet.nivel_agresividad];
                                return cfg ? (
                                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                        {cfg.label}
                                    </span>
                                ) : null;
                            })()}
                        </div>
                        {appt.owner && (
                            <p className="text-sm text-zinc-500 mt-0.5">
                                <Link href={route('owners.show', appt.owner.id)} className="hover:underline">{appt.owner.nombre}</Link>
                                {appt.owner.telefono && <span className="ml-2">{appt.owner.telefono}</span>}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {canEdit && !editing && (
                            <button onClick={() => setEditing(true)} className="bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                                Editar clase
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={() => doAction('training.cancel')} className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">Cancelar</button>
                        )}
                        {appt.estado === 'confirmada' && (
                            <button onClick={() => doAction('training.noShow')} className="bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">No se presentó</button>
                        )}
                        {appt.estado === 'pendiente' && (
                            <button onClick={() => doAction('training.confirm')} className="bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-sky-100 transition-colors">Confirmar</button>
                        )}
                        {appt.ticket_id && (
                            <Link href={route('pos.index', { ticket: appt.ticket_id })} className="bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                                Ver ticket POS #{appt.ticket_folio}
                            </Link>
                        )}
                    </div>
                </div>

                {appt.pet && (<>
                    <button type="button" onClick={() => setPetInfoOpen(o => !o)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 md:hidden flex items-center gap-1 transition-colors mb-1">
                        {petInfoOpen ? 'Ocultar detalles ▴' : 'Ver detalles ▾'}
                    </button>
                    <div className={`${petInfoOpen ? 'block' : 'hidden md:block'}`}>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600">
                            {appt.pet.raza && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Raza</span> {appt.pet.raza}</span>}
                            {appt.pet.tamanio && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Tamaño</span> <span className="capitalize">{appt.pet.tamanio}</span></span>}
                            {appt.pet.sexo && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Sexo</span> <span className="capitalize">{appt.pet.sexo}</span></span>}
                            {appt.pet.peso && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Peso</span> {appt.pet.peso} kg</span>}
                            {appt.pet.fecha_nacimiento && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Nacimiento</span> {fmtNac(appt.pet.fecha_nacimiento)}{calcEdad(appt.pet.fecha_nacimiento) ? <span className="ml-1 text-zinc-400 text-xs">({calcEdad(appt.pet.fecha_nacimiento)})</span> : null}</span>}
                        </div>
                        {appt.pet.obs_comportamiento && (
                            <div className="mt-1 text-xs text-zinc-500">
                                <span className="font-medium text-zinc-600">Comportamiento:</span> {appt.pet.obs_comportamiento}
                            </div>
                        )}
                    </div>
                </>)}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                    <span className="whitespace-nowrap"><span className="font-medium">Fecha:</span> {fmtNac(appt.fecha)}</span>
                    {appt.hora_inicio && <span className="whitespace-nowrap"><span className="font-medium">Hora:</span> {appt.hora_inicio.slice(0,5)}{appt.hora_fin ? ` – ${appt.hora_fin.slice(0,5)}` : ''}</span>}
                    {appt.entrenador && <span className="whitespace-nowrap"><span className="font-medium">Entrenador:</span> {appt.entrenador.nombre}</span>}
                </div>

                {appt.cobro_membresia && (
                    <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-50 text-zinc-700 px-2.5 py-1 rounded-full font-medium border border-zinc-200">
                            ✦ Membresía — 1 clase de entrenamiento descontada
                            {appt.creditos_entrenamiento_saldo != null && (
                                <span className="text-zinc-400">· saldo actual: {appt.creditos_entrenamiento_saldo}</span>
                            )}
                        </span>
                    </div>
                )}
            </div>

            {/* Detalles de la clase */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-zinc-800 text-sm">Detalles de la clase</h2>
                    {canEdit && !editing && (
                        <button onClick={() => setEditing(true)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">Editar</button>
                    )}
                </div>

                {editing ? (
                    <form onSubmit={saveEdit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.fecha} onChange={e => form.setData('fecha', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <AppointmentTimePicker horaInicio={form.data.hora_inicio} duracion={duracion}
                                    onChange={(hi, hf, dur) => { form.setData(d => ({ ...d, hora_inicio: hi, hora_fin: hf })); setDuracion(dur); }} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Entrenador</label>
                                <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.entrenador_id} onChange={e => form.setData('entrenador_id', e.target.value)}>
                                    <option value="">Sin asignar</option>
                                    {entrenadores.map(g => <option key={g.id} value={g.id}>{g.nombre} {g.apellido}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Notas internas</label>
                            <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.notas_internas} onChange={e => form.setData('notas_internas', e.target.value)} />
                        </div>

                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditing(false)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={form.processing} className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3 text-sm">
                        {appt.notas_internas && (
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Notas internas</p>
                                <p className="text-zinc-700 whitespace-pre-line">{appt.notas_internas}</p>
                            </div>
                        )}
                        {appt.estado === 'completada' && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Evento registrado en historial de la mascota.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Cargos / Cuenta */}
            <div className="bg-white border border-indigo-200 shadow-sm rounded-xl mb-4 overflow-hidden">
                <button type="button" onClick={() => setCargosOpen(o => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left">
                    <h2 className="font-semibold text-indigo-800 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Cargos
                        {totalCargos > 0 && (
                            <span className="text-indigo-600 font-bold">· {fmt(totalCargos)}</span>
                        )}
                    </h2>
                    <i className={`ti ti-chevron-down text-indigo-400 transition-transform duration-200 ${cargosOpen ? 'rotate-180' : ''}`} style={{ fontSize: '16px' }} />
                </button>
                {cargosOpen && <div className="px-5 pb-5 pt-3 space-y-3">
                    {chargesForm.data.items.length > 0 && (
                        <div className="divide-y border border-zinc-100 rounded-lg text-sm">
                            {chargesForm.data.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-2">
                                    <span className="flex-1 text-zinc-800">{item.nombre}</span>
                                    <span className="text-zinc-500 text-xs whitespace-nowrap">{item.cantidad}× {fmt(item.precio)}</span>
                                    <span className="text-zinc-700 text-xs font-medium whitespace-nowrap">{fmt(Number(item.precio) * Number(item.cantidad))}</span>
                                    {canEdit && (
                                        <button type="button" onClick={() => removeCharge(idx)}
                                            className="text-rose-400 hover:text-rose-600 transition-colors text-xs ml-1">✕</button>
                                    )}
                                </div>
                            ))}
                            <div className="px-3 py-2 flex justify-between font-semibold text-zinc-800 bg-zinc-50 rounded-b-lg">
                                <span>Total</span>
                                <span>{fmt(totalCargos)}</span>
                            </div>
                        </div>
                    )}

                    {canEdit && (
                        <form onSubmit={saveCharges} className="space-y-2 border border-indigo-100 rounded-xl p-3 bg-indigo-50/40">
                            <select className="w-full border-gray-300 rounded-lg text-sm py-2"
                                value={itemDraft.catalog_item_id} onChange={pickCatalogItem}>
                                <option value="">— Seleccionar del catálogo —</option>
                                {catalogItems.map(c => <option key={c.id} value={c.id}>{c.nombre} · {fmt(c.precio)}</option>)}
                            </select>

                            {!itemDraft.catalog_item_id && (
                                <input className="w-full border-gray-300 rounded-lg text-sm py-2"
                                    placeholder="Nombre del cargo *"
                                    value={itemDraft.nombre}
                                    onChange={e => setItemDraft(d => ({ ...d, nombre: e.target.value }))} />
                            )}

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                                    <input type="number" step="0.01" min="0"
                                        className="w-full border-gray-300 rounded-lg text-sm py-2 pl-6"
                                        placeholder="0.00"
                                        value={itemDraft.precio}
                                        onChange={e => setItemDraft(d => ({ ...d, precio: e.target.value }))} />
                                </div>
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shrink-0">
                                    <button type="button"
                                        onClick={() => setItemDraft(d => ({ ...d, cantidad: String(Math.max(1, Number(d.cantidad) - 1)) }))}
                                        className="px-3 py-2 text-zinc-600 hover:bg-zinc-100 text-base font-bold transition-colors">−</button>
                                    <span className="px-3 text-sm font-medium text-zinc-800 min-w-[2rem] text-center">{itemDraft.cantidad}</span>
                                    <button type="button"
                                        onClick={() => setItemDraft(d => ({ ...d, cantidad: String(Number(d.cantidad) + 1) }))}
                                        className="px-3 py-2 text-zinc-600 hover:bg-zinc-100 text-base font-bold transition-colors">+</button>
                                </div>
                                <button type="button" onClick={addCharge}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0">
                                    Agregar
                                </button>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button type="submit" disabled={chargesForm.processing}
                                    className="bg-zinc-900 hover:bg-zinc-700 text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    {chargesForm.processing ? 'Guardando…' : 'Guardar cargos'}
                                </button>
                            </div>
                        </form>
                    )}

                    {chargesForm.data.items.length === 0 && !canEdit && (
                        <p className="text-sm text-zinc-400 text-center py-2">Sin cargos registrados.</p>
                    )}
                </div>}
            </div>

            {/* Completar clase */}
            <div className="bg-white border border-emerald-200 shadow-sm rounded-xl mb-4 overflow-hidden">
                <button type="button" onClick={() => setSalidaOpen(o => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left bg-emerald-50 hover:bg-emerald-100 transition-colors">
                    <h2 className="font-semibold text-emerald-800 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Completar clase
                    </h2>
                    <i className={`ti ti-chevron-down text-emerald-400 transition-transform duration-200 ${salidaOpen ? 'rotate-180' : ''}`} style={{ fontSize: '16px' }} />
                </button>
                {salidaOpen && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Notas de la clase</label>
                        <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={3}
                            placeholder="Avance, comportamiento, recomendaciones para la próxima clase..."
                            value={completeForm.data.notas_resultado}
                            onChange={e => completeForm.setData('notas_resultado', e.target.value)}
                            disabled={!canEdit} />
                    </div>

                    {canEdit && (
                        <div className="flex justify-end">
                            <form onSubmit={doComplete}>
                                <button type="submit" disabled={completeForm.processing}
                                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {completeForm.processing ? 'Completando...' : 'Completar clase'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>}
            </div>
        </TenantLayout>
    );
}
