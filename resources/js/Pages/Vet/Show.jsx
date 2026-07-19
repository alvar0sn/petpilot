import AppointmentTimePicker from '@/Components/AppointmentTimePicker';
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

export default function VetShow({ appointment, veterinarios, catalogItems }) {
    const appt = appointment;
    const canEdit = ['pendiente', 'confirmada'].includes(appt.estado);

    const form = useForm({
        fecha:          appt.fecha,
        hora_inicio:    appt.hora_inicio ?? '',
        hora_fin:       appt.hora_fin ?? '',
        veterinario_id: appt.veterinario?.id ?? '',
        notas_internas: appt.notas_internas ?? '',
        items:          appt.items ?? [],
    });
    const [editing, setEditing] = useState(false);
    const [petInfoOpen, setPetInfoOpen] = useState(false);

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
    function saveEdit(e) { e.preventDefault(); form.put(route('vet.update', appt.id), { onSuccess: () => setEditing(false) }); }
    function doAction(routeName) { router.post(route(routeName, appt.id)); }

    const totalItems = (form.data.items ?? []).reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);

    const rec = appt.recepcion ?? {};
    const recForm = useForm({
        peso:               rec.peso               ?? '',
        temperatura:        rec.temperatura        ?? '',
        motivo:             rec.motivo             ?? '',
        diagnostico:        rec.diagnostico        ?? '',
        medicamentos:       rec.medicamentos       ?? '',
        notas:              rec.notas              ?? '',
        vacuna:             rec.vacuna             ?? false,
        vacuna_nombre:      rec.vacuna_nombre      ?? '',
        vacuna_lote:        rec.vacuna_lote        ?? '',
        vacuna_laboratorio: rec.vacuna_laboratorio ?? '',
        vacuna_proxima:     rec.vacuna_proxima     ?? '',
        despa:              rec.despa              ?? false,
        despa_producto:     rec.despa_producto     ?? '',
        despa_via:          rec.despa_via          ?? '',
        despa_proxima:      rec.despa_proxima      ?? '',
        consulta_proxima:   rec.consulta_proxima   ?? '',
    });
    function saveRecepcion(e) { e.preventDefault(); recForm.post(route('vet.recepcion', appt.id)); }

    const completeForm = useForm({});
    function doComplete(e) { e.preventDefault(); completeForm.post(route('vet.complete', appt.id)); }

    const photoForm = useForm({ foto: null, descripcion: '' });
    const fileRef = useRef();
    const [compressing, setCompressing] = useState(false);

    async function handlePhotoSelect(e) {
        const file = e.target.files[0] ?? null;
        if (!file) { photoForm.setData('foto', null); return; }
        setCompressing(true);
        try {
            photoForm.setData('foto', await compressImage(file));
        } finally {
            setCompressing(false);
        }
    }

    function uploadPhoto(e) {
        e.preventDefault();
        if (!photoForm.data.foto) return;
        photoForm.post(route('vet.photos.store', appt.id), {
            forceFormData: true,
            onSuccess: () => { photoForm.reset(); fileRef.current.value = ''; },
        });
    }
    function deletePhoto(photoId) {
        if (!confirm('¿Eliminar foto?')) return;
        router.delete(route('vet.photos.destroy', { appointment: appt.id, photo: photoId }));
    }

    return (
        <TenantLayout title="Consulta Veterinaria">
            <div className="mb-4">
                <Link href={route('vet.index', { week_start: appt.fecha })} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                    ← Volver al calendario
                </Link>
            </div>

            {/* Header */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                {/* Fila superior: nombre + acciones */}
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
                                Editar consulta
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={() => doAction('vet.cancel')} className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">Cancelar</button>
                        )}
                        {appt.estado === 'confirmada' && (
                            <button onClick={() => doAction('vet.noShow')} className="bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">No se presentó</button>
                        )}
                        {appt.ticket_id && (
                            <Link href={route('pos.index', { ticket: appt.ticket_id })} className="bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                                Ver ticket POS #{appt.ticket_folio}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Info de mascota (colapsable en móvil) */}
                {appt.pet && (<>
                    <button type="button" onClick={() => setPetInfoOpen(o => !o)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 md:hidden flex items-center gap-1 transition-colors mb-1">
                        {petInfoOpen ? 'Ocultar detalles ▴' : 'Ver detalles ▾'}
                    </button>
                    <div className={`${petInfoOpen ? 'block' : 'hidden md:block'}`}>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600">
                            {appt.pet.raza && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Raza</span> {appt.pet.raza}</span>}
                            {appt.pet.tamanio && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Tamaño</span> <span className="capitalize">{appt.pet.tamanio}</span></span>}
                            {appt.pet.sexo && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Sexo</span> <span className="capitalize">{appt.pet.sexo}{appt.pet.esterilizado ? ' · esterilizado/a' : ''}</span></span>}
                            {appt.pet.peso && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Peso</span> {appt.pet.peso} kg</span>}
                            {appt.pet.fecha_nacimiento && <span className="whitespace-nowrap"><span className="font-medium text-zinc-500">Nacimiento</span> {fmtNac(appt.pet.fecha_nacimiento)}{calcEdad(appt.pet.fecha_nacimiento) ? <span className="ml-1 text-zinc-400 text-xs">({calcEdad(appt.pet.fecha_nacimiento)})</span> : null}</span>}
                        </div>
                        {(appt.pet.alergias || appt.pet.padecimientos || appt.pet.obs_comportamiento) && (
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                                {appt.pet.alergias && <span><span className="font-medium text-zinc-600">Alergias:</span> {appt.pet.alergias}</span>}
                                {appt.pet.padecimientos && <span><span className="font-medium text-zinc-600">Padecimientos:</span> {appt.pet.padecimientos}</span>}
                                {appt.pet.obs_comportamiento && <span><span className="font-medium text-zinc-600">Comportamiento:</span> {appt.pet.obs_comportamiento}</span>}
                            </div>
                        )}
                    </div>
                </>)}

                {/* Datos de la consulta */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                    <span className="whitespace-nowrap"><span className="font-medium">Fecha:</span> {fmtNac(appt.fecha)}</span>
                    {appt.hora_inicio && <span className="whitespace-nowrap"><span className="font-medium">Hora:</span> {appt.hora_inicio.slice(0,5)}{appt.hora_fin ? ` – ${appt.hora_fin.slice(0,5)}` : ''}</span>}
                    {appt.veterinario && <span className="whitespace-nowrap"><span className="font-medium">Veterinario:</span> {appt.veterinario.nombre}</span>}
                </div>
            </div>

            {/* Detalles */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-zinc-800 text-sm">Detalles de la consulta</h2>
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
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Veterinario</label>
                                <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.veterinario_id} onChange={e => form.setData('veterinario_id', e.target.value)}>
                                    <option value="">Sin asignar</option>
                                    {veterinarios.map(v => <option key={v.id} value={v.id}>{v.nombre} {v.apellido}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <AppointmentTimePicker horaInicio={form.data.hora_inicio} duracion={duracion}
                                    onChange={(hi, hf, dur) => { form.setData(d => ({ ...d, hora_inicio: hi, hora_fin: hf })); setDuracion(dur); }} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Servicios / honorarios</label>
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

                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditing(false)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-1.5 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={form.processing} className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3 text-sm">
                        {appt.items?.length > 0 ? (
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-1">Servicios / honorarios</p>
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
                        {appt.notas_internas && (
                            <div>
                                <p className="text-xs font-medium text-zinc-500 mb-0.5">Notas internas</p>
                                <p className="text-zinc-700 whitespace-pre-line">{appt.notas_internas}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Ficha de atención */}
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                <h2 className="font-semibold text-zinc-800 text-sm mb-4">Ficha de atención</h2>
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Peso actual (kg)</label>
                        <input type="number" step="0.01" min="0" max="999" className="w-32 border-gray-300 rounded-lg text-sm"
                            placeholder="Ej. 4.5" value={recForm.data.peso} onChange={e => recForm.setData('peso', e.target.value)} />
                        {appt.pet?.peso && (
                            <p className="text-xs text-zinc-400 mt-1">Último registrado: {appt.pet.peso} kg</p>
                        )}
                    </div>

                    <div className="border border-zinc-100 rounded-xl p-4 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={recForm.data.vacuna}
                                onChange={e => recForm.setData('vacuna', e.target.checked)} className="rounded w-4 h-4" />
                            <span className="text-sm font-semibold text-zinc-800">Se puso vacuna</span>
                        </label>
                        {recForm.data.vacuna && (
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Nombre de la vacuna</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Rabia, Parvovirus, etc."
                                        value={recForm.data.vacuna_nombre} onChange={e => recForm.setData('vacuna_nombre', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Lote</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Número de lote"
                                        value={recForm.data.vacuna_lote} onChange={e => recForm.setData('vacuna_lote', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Laboratorio</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Nombre del laboratorio"
                                        value={recForm.data.vacuna_laboratorio} onChange={e => recForm.setData('vacuna_laboratorio', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Próxima vacuna sugerida</label>
                                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                        value={recForm.data.vacuna_proxima} onChange={e => recForm.setData('vacuna_proxima', e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border border-zinc-100 rounded-xl p-4 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={recForm.data.despa}
                                onChange={e => recForm.setData('despa', e.target.checked)} className="rounded w-4 h-4" />
                            <span className="text-sm font-semibold text-zinc-800">Se desparasitó</span>
                        </label>
                        {recForm.data.despa && (
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Producto</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Drontal, Milbemax, etc."
                                        value={recForm.data.despa_producto} onChange={e => recForm.setData('despa_producto', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Vía de administración</label>
                                    <select className="w-full border-gray-300 rounded-lg text-sm"
                                        value={recForm.data.despa_via} onChange={e => recForm.setData('despa_via', e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="oral">Oral</option>
                                        <option value="inyectable">Inyectable</option>
                                        <option value="topica">Tópica</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Próxima desparasitación sugerida</label>
                                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                        value={recForm.data.despa_proxima} onChange={e => recForm.setData('despa_proxima', e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Próxima consulta sugerida</label>
                        <input type="date" className="w-44 border-gray-300 rounded-lg text-sm"
                            value={recForm.data.consulta_proxima} onChange={e => recForm.setData('consulta_proxima', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Temperatura (°C)</label>
                            <input type="number" step="0.1" min="0" max="50" className="w-32 border-gray-300 rounded-lg text-sm"
                                placeholder="Ej. 38.5" value={recForm.data.temperatura} onChange={e => recForm.setData('temperatura', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Motivo de consulta</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm"
                            placeholder="Motivo por el que asiste el paciente..."
                            value={recForm.data.motivo} onChange={e => recForm.setData('motivo', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Diagnóstico</label>
                        <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={3}
                            placeholder="Diagnóstico del veterinario..."
                            value={recForm.data.diagnostico} onChange={e => recForm.setData('diagnostico', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Medicamentos</label>
                        <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2}
                            placeholder="Medicamentos recetados, dosis..."
                            value={recForm.data.medicamentos} onChange={e => recForm.setData('medicamentos', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wide">Notas adicionales</label>
                        <textarea className="w-full border-gray-300 rounded-lg text-sm" rows={2}
                            placeholder="Observaciones, recomendaciones..."
                            value={recForm.data.notas} onChange={e => recForm.setData('notas', e.target.value)} />
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                        <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Fotos del servicio</p>
                        {appt.photos?.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                                {appt.photos.map(photo => (
                                    <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-zinc-100 aspect-square">
                                        <img src={photo.url} alt={photo.descripcion ?? ''} className="w-full h-full object-cover" />
                                        {photo.descripcion && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">{photo.descripcion}</div>
                                        )}
                                        <button onClick={() => deletePhoto(photo.id)}
                                            className="absolute top-1 right-1 bg-zinc-900 text-white rounded-full w-5 h-5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">✕</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-400 mb-3">Sin fotos.</p>
                        )}
                        <form onSubmit={uploadPhoto} className="flex flex-wrap gap-2 items-end">
                            <input ref={fileRef} type="file" accept="image/*"
                                className="text-sm text-zinc-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700"
                                onChange={handlePhotoSelect} />
                            <input className="border-gray-300 rounded-lg text-sm w-44" placeholder="Descripción (opcional)"
                                value={photoForm.data.descripcion} onChange={e => photoForm.setData('descripcion', e.target.value)} />
                            <button type="submit" disabled={!photoForm.data.foto || photoForm.processing || compressing}
                                className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 shrink-0 transition-colors">
                                {compressing ? 'Comprimiendo...' : photoForm.processing ? 'Subiendo...' : 'Subir foto'}
                            </button>
                        </form>
                    </div>

                    <form onSubmit={saveRecepcion} className="flex justify-end">
                        <button type="submit" disabled={recForm.processing}
                            className="bg-zinc-900 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            {recForm.processing ? 'Guardando...' : 'Guardar ficha'}
                        </button>
                    </form>

                    {canEdit && (
                        <form onSubmit={doComplete} className="flex justify-end border-t border-zinc-100 pt-4">
                            <button type="submit" disabled={completeForm.processing}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                {completeForm.processing ? 'Completando...' : 'Completar visita'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Eventos generados */}
            {appt.has_events && (
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                    <h2 className="font-semibold text-zinc-800 text-sm mb-3">Eventos registrados</h2>
                    <div className="space-y-2">
                        {appt.linked_events.map(ev => (
                            <div key={ev.id} className="flex items-center gap-3 text-sm px-3 py-2 bg-emerald-50 rounded-lg">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-emerald-800">{ev.tipo}</span>
                                {ev.vacuna_nombre && <span className="text-emerald-600">· {ev.vacuna_nombre}</span>}
                                {ev.despa_producto && <span className="text-emerald-600">· {ev.despa_producto}</span>}
                                {ev.proximo_recordatorio && (
                                    <span className="ml-auto text-xs text-zinc-500">próximo: {ev.proximo_recordatorio}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-400 mt-3">
                        Ver historial completo en{' '}
                        <Link href={route('pets.show', appt.pet.id)} className="text-zinc-600 hover:underline">
                            ficha de {appt.pet.nombre}
                        </Link>
                    </p>
                </div>
            )}
        </TenantLayout>
    );
}
