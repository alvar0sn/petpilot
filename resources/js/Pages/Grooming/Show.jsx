import AppointmentTimePicker from '@/Components/AppointmentTimePicker';
import Lightbox from '@/Components/Lightbox';
import TenantLayout from '@/Layouts/TenantLayout';
import { compressImage } from '@/utils/compressImage';
import { Link, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function fmtNac(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${meses[m - 1]} ${y}`;
}

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

export default function GroomingShow({ appointment, stations, eventTypes, groomers, catalogItems, checklistItems }) {
    const appt = appointment;
    const canEdit = ['pendiente', 'confirmada'].includes(appt.estado);

    const form = useForm({
        tipo_servicio_id: appt.tipo_servicio?.id ?? '',
        fecha: appt.fecha,
        hora_inicio: appt.hora_inicio ?? '',
        hora_fin: appt.hora_fin ?? '',
        groomer_id: appt.groomer?.id ?? '',
        station_id: appt.station?.id ?? '',
        notas_internas: appt.notas_internas ?? '',
        servicio_domicilio: appt.servicio_domicilio ?? false,
        direccion_entrega: appt.direccion_entrega ?? '',
        items: appt.items ?? [],
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
    const [itemDraft, setItemDraft] = useState({ catalog_item_id: '', nombre: '', precio: '', cantidad: '1' });

    function pickCatalogItem(e) {
        const id = e.target.value;
        const found = catalogItems.find(c => String(c.id) === id);
        setItemDraft(d => ({ ...d, catalog_item_id: id, nombre: found?.nombre ?? d.nombre, precio: found ? String(found.precio) : d.precio }));
    }
    function addItem() {
        if (!itemDraft.nombre || itemDraft.precio === '') return;
        form.setData('items', [...form.data.items, { ...itemDraft, cantidad: parseFloat(itemDraft.cantidad) || 1 }]);
        setItemDraft({ catalog_item_id: '', nombre: '', precio: '', cantidad: '1' });
    }
    function removeItem(idx) { form.setData('items', form.data.items.filter((_, i) => i !== idx)); }
    function saveEdit(e) { e.preventDefault(); form.put(route('grooming.update', appt.id), { onSuccess: () => setEditing(false) }); }
    function doAction(routeName) { router.post(route(routeName, appt.id)); }

    const ANALISIS = [
        { key: 'verrugas',          label: 'Verrugas' },
        { key: 'pulgas_garrapatas', label: 'Pulgas / garrapatas' },
        { key: 'secreciones',       label: 'Secreciones' },
        { key: 'lesiones',          label: 'Lesiones' },
        { key: 'alergias_visibles', label: 'Alergias visibles' },
        { key: 'nudos_severos',     label: 'Nudos severos' },
    ];
    const ESTADO_MANTO = [
        { value: 'bueno',        label: 'Bueno' },
        { value: 'regular',      label: 'Regular' },
        { value: 'enredado',     label: 'Enredado' },
        { value: 'muy_enredado', label: 'Muy enredado' },
        { value: 'opaco',        label: 'Opaco / seco' },
    ];

    const rec = appt.recepcion ?? {};
    const recForm = useForm({
        verrugas:          rec.verrugas          ?? false,
        pulgas_garrapatas: rec.pulgas_garrapatas ?? false,
        secreciones:       rec.secreciones       ?? false,
        lesiones:          rec.lesiones          ?? false,
        alergias_visibles: rec.alergias_visibles ?? false,
        nudos_severos:     rec.nudos_severos     ?? false,
        estado_manto:      rec.estado_manto      ?? '',
        notas_sesion:      rec.notas_sesion      ?? '',
        accesorios:        appt.accesorios       ?? '',
    });
    function saveRecepcion(e) { e.preventDefault(); recForm.post(route('grooming.recepcion', appt.id)); }

    const completeForm = useForm({
        checklist_items:  appt.checklist_hecho  ?? [],
        notas_resultado:  appt.notas_resultado  ?? '',
        proxima_estetica: '',
    });
    function toggleChecklist(id) {
        const items = completeForm.data.checklist_items;
        completeForm.setData('checklist_items', items.includes(id) ? items.filter(x => x !== id) : [...items, id]);
    }
    function doComplete(e) { e.preventDefault(); completeForm.post(route('grooming.complete', appt.id)); }

    const photoForm = useForm({ foto: null, descripcion: '' });
    const fileRef = useRef();
    const resultPhotoForm = useForm({ foto: null, descripcion: '' });
    const resultFileRef = useRef();
    const [lightbox, setLightbox] = useState(null);
    const [compressing, setCompressing] = useState(false);

    async function handlePhotoSelect(e, formObj) {
        const file = e.target.files[0] ?? null;
        if (!file) { formObj.setData('foto', null); return; }
        setCompressing(true);
        try {
            formObj.setData('foto', await compressImage(file));
        } finally {
            setCompressing(false);
        }
    }

    const hasRecepcionData = Object.values(rec).some(v => v) || appt.accesorios || appt.photos?.some(p => p.tipo === 'recepcion');
    const [recepcionOpen, setRecepcionOpen] = useState(hasRecepcionData || canEdit);
    const hasSalidaData = completeForm.data.notas_resultado || appt.photos?.some(p => p.tipo === 'resultado') || appt.has_event;
    const [salidaOpen, setSalidaOpen] = useState(hasSalidaData || appt.estado === 'completada');

    function uploadPhoto(tipo) {
        return function(e) {
            e.preventDefault();
            const f = tipo === 'resultado' ? resultPhotoForm : photoForm;
            const r = tipo === 'resultado' ? resultFileRef  : fileRef;
            if (!f.data.foto) return;
            f.transform(d => ({ ...d, tipo }));
            f.post(route('grooming.photos.store', appt.id), {
                forceFormData: true,
                onSuccess: () => { f.reset(); r.current.value = ''; },
            });
        };
    }
    function deletePhoto(photoId) {
        if (!confirm('¿Eliminar foto?')) return;
        router.delete(route('grooming.photos.destroy', { appointment: appt.id, photo: photoId }));
    }

    const totalItems = (form.data.items ?? []).reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);

    return (
        <TenantLayout title="Cita de Grooming">
            <div className="mb-4">
                <Link href={route('grooming.index', { week_start: appt.fecha })} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                    ← Volver al calendario
                </Link>
            </div>

            {/* Header */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-semibold text-zinc-900">
                                <Link href={route('pets.show', appt.pet?.id)} className="hover:underline">
                                    {appt.pet?.nombre}
                                </Link>
                            </h1>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoBadge[appt.estado] ?? 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200'}`}>
                                {estadoLabel[appt.estado] ?? appt.estado}
                            </span>
                        </div>
                        {appt.owner && (
                            <p className="text-sm text-zinc-500 mt-0.5">
                                <Link href={route('owners.show', appt.owner.id)} className="hover:underline">{appt.owner.nombre}</Link>
                                {appt.owner.telefono && <span className="ml-2">{appt.owner.telefono}</span>}
                            </p>
                        )}
                        {appt.pet && (
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600">
                                {appt.pet.raza && <span><span className="font-medium text-zinc-500">Raza</span> {appt.pet.raza}</span>}
                                {appt.pet.tamanio && <span><span className="font-medium text-zinc-500">Tamaño</span> <span className="capitalize">{appt.pet.tamanio}</span></span>}
                                {appt.pet.sexo && <span><span className="font-medium text-zinc-500">Sexo</span> <span className="capitalize">{appt.pet.sexo}{appt.pet.esterilizado ? ' · esterilizado/a' : ''}</span></span>}
                                {appt.pet.peso && <span><span className="font-medium text-zinc-500">Peso</span> {appt.pet.peso} kg</span>}
                                {appt.pet.fecha_nacimiento && <span><span className="font-medium text-zinc-500">Nacimiento</span> {fmtNac(appt.pet.fecha_nacimiento)}</span>}
                                {appt.pet.nivel_agresividad && appt.pet.nivel_agresividad !== 'tranquilo' && (
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${appt.pet.nivel_agresividad === 'agresivo' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {appt.pet.nivel_agresividad}
                                    </span>
                                )}
                            </div>
                        )}
                        {(appt.pet?.alergias || appt.pet?.padecimientos) && (
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                                {appt.pet.alergias && <span><span className="font-medium text-zinc-600">Alergias:</span> {appt.pet.alergias}</span>}
                                {appt.pet.padecimientos && <span><span className="font-medium text-zinc-600">Padecimientos:</span> {appt.pet.padecimientos}</span>}
                            </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                            <span><span className="font-medium">Fecha:</span> {appt.fecha}</span>
                            {appt.hora_inicio && <span><span className="font-medium">Hora:</span> {appt.hora_inicio.slice(0,5)}{appt.hora_fin ? ` – ${appt.hora_fin.slice(0,5)}` : ''}</span>}
                            {appt.tipo_servicio && <span><span className="font-medium">Servicio:</span> {appt.tipo_servicio.nombre}</span>}
                            {appt.groomer && <span><span className="font-medium">Groomer:</span> {appt.groomer.nombre}</span>}
                            {appt.station && <span><span className="font-medium">Estación:</span> {appt.station.nombre}</span>}
                        </div>
                        {appt.cobro_membresia && (
                            <div className="mt-2">
                                <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-50 text-zinc-700 px-2.5 py-1 rounded-full font-medium border border-zinc-200">
                                    ✦ Membresía — 1 crédito de estética descontado
                                    {appt.creditos_estetica_saldo != null && (
                                        <span className="text-zinc-400">· saldo actual: {appt.creditos_estetica_saldo}</span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {canEdit && !editing && (
                            <button onClick={() => setEditing(true)} className="bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                                Editar cita
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={() => doAction('grooming.cancel')} className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">Cancelar</button>
                        )}
                        {appt.estado === 'confirmada' && (
                            <button onClick={() => doAction('grooming.noShow')} className="bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">No se presentó</button>
                        )}
                        {appt.ticket_id && (
                            <Link href={route('pos.index', { ticket: appt.ticket_id })} className="bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                                Ver ticket POS #{appt.ticket_folio}
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Detalles de la cita */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-zinc-800 text-sm">Detalles de la cita</h2>
                    {canEdit && !editing && (
                        <button onClick={() => setEditing(true)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">Editar</button>
                    )}
                </div>

                {editing ? (
                    <form onSubmit={saveEdit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de servicio</label>
                                <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.tipo_servicio_id} onChange={e => form.setData('tipo_servicio_id', e.target.value)}>
                                    {eventTypes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm py-1.5" value={form.data.fecha} onChange={e => form.setData('fecha', e.target.value)} />
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
                                            <span className="text-zinc-500">{item.cantidad}x {fmt(item.precio)}</span>
                                            <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                                        </div>
                                    ))}
                                    <div className="px-2 py-1.5 flex justify-between font-medium text-zinc-700">
                                        <span>Total</span><span>{fmt(totalItems)}</span>
                                    </div>
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
                            <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2} value={form.data.notas_internas} onChange={e => form.setData('notas_internas', e.target.value)} />
                        </div>

                        <div>
                            <label className="flex items-center justify-between cursor-pointer px-3 py-2.5 border border-zinc-200 rounded-lg">
                                <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">🛵 Servicio a domicilio</span>
                                <button type="button"
                                    onClick={() => form.setData('servicio_domicilio', !form.data.servicio_domicilio)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${form.data.servicio_domicilio ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.data.servicio_domicilio ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </label>
                            {form.data.servicio_domicilio && (
                                <textarea className="w-full border-gray-300 rounded-lg text-sm mt-1.5 resize-none" rows={2}
                                    placeholder="Dirección de entrega"
                                    value={form.data.direccion_entrega}
                                    onChange={e => form.setData('direccion_entrega', e.target.value)} />
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditing(false)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={form.processing} className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3 text-sm">
                        {appt.items?.length > 0 ? (
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-1">Servicios / productos</p>
                                <div className="divide-y border border-zinc-100 rounded-lg">
                                    {appt.items.map(item => (
                                        <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
                                            <span>{item.nombre}</span>
                                            <span className="text-zinc-500">{item.cantidad}x {fmt(item.precio)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between px-3 py-2 font-medium text-zinc-700">
                                        <span>Total</span>
                                        <span>{fmt(appt.items.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0))}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-zinc-400 text-xs">Sin servicios registrados.</p>
                        )}
                        {appt.servicio_domicilio && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                <p className="text-xs font-medium text-blue-700 mb-0.5">🛵 Servicio a domicilio</p>
                                {appt.direccion_entrega && <p className="text-zinc-700 text-xs">{appt.direccion_entrega}</p>}
                            </div>
                        )}
                        {appt.notas_internas && (
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Notas internas</p>
                                <p className="text-zinc-700 whitespace-pre-line">{appt.notas_internas}</p>
                            </div>
                        )}
                        {appt.has_event && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">Evento registrado en historial de la mascota.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Recepción */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl mb-4 overflow-hidden">
                <button type="button" onClick={() => setRecepcionOpen(o => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors">
                    <h2 className="font-semibold text-zinc-800 text-sm">Recepción</h2>
                    <i className={`ti ti-chevron-down text-zinc-400 transition-transform duration-200 ${recepcionOpen ? 'rotate-180' : ''}`} style={{ fontSize: '16px' }} />
                </button>
                {recepcionOpen && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100">
                    <div>
                        <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">Análisis visual</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ANALISIS.map(({ key, label }) => {
                                const active = !!recForm.data[key];
                                return (
                                    <button key={key} type="button" onClick={() => recForm.setData(key, !recForm.data[key])}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${active ? 'bg-rose-50 border-rose-300 text-rose-700' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 bg-white'}`}>
                                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${active ? 'border-rose-500 bg-rose-500' : 'border-zinc-300'}`}>
                                            {active && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                                        </span>
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">Estado del manto</p>
                        <div className="flex flex-wrap gap-2">
                            {ESTADO_MANTO.map(({ value, label }) => {
                                const active = recForm.data.estado_manto === value;
                                return (
                                    <button key={value} type="button" onClick={() => recForm.setData('estado_manto', active ? '' : value)}
                                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${active ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white'}`}>
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Accesorios que trae</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Collar, moño, ropa, etc."
                            value={recForm.data.accesorios} onChange={e => recForm.setData('accesorios', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Notas de la sesión</label>
                        <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={3}
                            placeholder="Observaciones, instrucciones especiales, comportamiento..."
                            value={recForm.data.notas_sesion} onChange={e => recForm.setData('notas_sesion', e.target.value)} />
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                        <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Fotos de recepción</p>
                        {appt.photos?.filter(p => p.tipo === 'recepcion').length > 0 ? (() => {
                            const rec = appt.photos.filter(p => p.tipo === 'recepcion');
                            return (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                                    {rec.map((photo, i) => (
                                        <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-zinc-100 aspect-square">
                                            <img src={photo.url} alt={photo.descripcion ?? ''}
                                                className="w-full h-full object-cover cursor-zoom-in"
                                                onClick={() => setLightbox({ photos: rec, index: i })} />
                                            {photo.descripcion && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">{photo.descripcion}</div>
                                            )}
                                            <button onClick={() => deletePhoto(photo.id)}
                                                className="absolute top-1 right-1 bg-zinc-900 text-white rounded-full w-5 h-5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })() : (
                            <p className="text-sm text-zinc-400 mb-3">Sin fotos de recepción.</p>
                        )}
                        <form onSubmit={uploadPhoto('recepcion')} className="flex flex-wrap gap-2 items-end">
                            <input ref={fileRef} type="file" accept="image/*"
                                className="text-sm text-zinc-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700"
                                onChange={e => handlePhotoSelect(e, photoForm)} />
                            <input className="border-gray-300 rounded-lg text-sm w-44" placeholder="Descripción (opcional)"
                                value={photoForm.data.descripcion} onChange={e => photoForm.setData('descripcion', e.target.value)} />
                            <button type="submit" disabled={!photoForm.data.foto || photoForm.processing || compressing}
                                className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 shrink-0 transition-colors">
                                {compressing ? 'Comprimiendo...' : photoForm.processing ? 'Subiendo...' : 'Subir foto'}
                            </button>
                        </form>
                        {photoForm.errors.foto && <p className="text-rose-500 text-xs mt-1">{photoForm.errors.foto}</p>}
                    </div>

                    <form onSubmit={saveRecepcion} className="flex justify-end">
                        <button type="submit" disabled={recForm.processing}
                            className="bg-zinc-900 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            {recForm.processing ? 'Guardando...' : 'Guardar recepción'}
                        </button>
                    </form>
                </div>}
            </div>

            {/* Formulario de salida */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl mb-4 overflow-hidden">
                <button type="button" onClick={() => setSalidaOpen(o => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors">
                    <h2 className="font-semibold text-zinc-800 text-sm">Formulario de salida</h2>
                    <i className={`ti ti-chevron-down text-zinc-400 transition-transform duration-200 ${salidaOpen ? 'rotate-180' : ''}`} style={{ fontSize: '16px' }} />
                </button>
                {salidaOpen && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100">
                    {checklistItems.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">Checklist del servicio</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {checklistItems.map(item => {
                                    const checked = completeForm.data.checklist_items.includes(item.id);
                                    return (
                                        <label key={item.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
                                            <input type="checkbox" checked={checked}
                                                onChange={() => canEdit && toggleChecklist(item.id)}
                                                disabled={!canEdit} className="rounded" />
                                            {item.nombre}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Próxima cita de estética sugerida</label>
                        <input type="date" className="w-44 border-gray-300 rounded-lg text-sm"
                            value={completeForm.data.proxima_estetica}
                            onChange={e => completeForm.setData('proxima_estetica', e.target.value)}
                            disabled={!canEdit} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Notas del servicio</label>
                        <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={3}
                            placeholder="Observaciones del grooming, comportamiento, recomendaciones..."
                            value={completeForm.data.notas_resultado}
                            onChange={e => completeForm.setData('notas_resultado', e.target.value)}
                            disabled={!canEdit} />
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                        <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Fotos del resultado</p>
                        {appt.photos?.filter(p => p.tipo === 'resultado').length > 0 ? (() => {
                            const res = appt.photos.filter(p => p.tipo === 'resultado');
                            return (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                                    {res.map((photo, i) => (
                                        <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-zinc-100 aspect-square">
                                            <img src={photo.url} alt={photo.descripcion ?? ''}
                                                className="w-full h-full object-cover cursor-zoom-in"
                                                onClick={() => setLightbox({ photos: res, index: i })} />
                                            {photo.descripcion && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">{photo.descripcion}</div>
                                            )}
                                            <button onClick={() => deletePhoto(photo.id)}
                                                className="absolute top-1 right-1 bg-zinc-900 text-white rounded-full w-5 h-5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })() : (
                            <p className="text-sm text-zinc-400 mb-3">Sin fotos del resultado.</p>
                        )}
                        <form onSubmit={uploadPhoto('resultado')} className="flex flex-wrap gap-2 items-end">
                            <input ref={resultFileRef} type="file" accept="image/*"
                                className="text-sm text-zinc-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700"
                                onChange={e => handlePhotoSelect(e, resultPhotoForm)} />
                            <input className="border-gray-300 rounded-lg text-sm w-44" placeholder="Descripción (opcional)"
                                value={resultPhotoForm.data.descripcion} onChange={e => resultPhotoForm.setData('descripcion', e.target.value)} />
                            <button type="submit" disabled={!resultPhotoForm.data.foto || resultPhotoForm.processing || compressing}
                                className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 shrink-0 transition-colors">
                                {compressing ? 'Comprimiendo...' : resultPhotoForm.processing ? 'Subiendo...' : 'Subir foto'}
                            </button>
                        </form>
                        {resultPhotoForm.errors.foto && <p className="text-rose-500 text-xs mt-1">{resultPhotoForm.errors.foto}</p>}
                    </div>

                    {canEdit && (
                        <form onSubmit={doComplete} className="flex justify-end">
                            <button type="submit" disabled={completeForm.processing}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                {completeForm.processing ? 'Completando...' : 'Completar cita'}
                            </button>
                        </form>
                    )}
                </div>}
            </div>
            {lightbox && (
                <Lightbox
                    photos={lightbox.photos}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onPrev={() => setLightbox(lb => ({ ...lb, index: lb.index - 1 }))}
                    onNext={() => setLightbox(lb => ({ ...lb, index: lb.index + 1 }))}
                />
            )}
        </TenantLayout>
    );
}
