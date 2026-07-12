import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';

export default function EventEdit({ event, checklistItems }) {
    const typeName = event.event_type?.nombre;

    const { data, setData, put, processing, errors } = useForm({
        fecha: event.fecha ?? '',
        peso: event.peso ?? '',
        notas: event.notas ?? '',
        // Estética
        est_verrugas: !!event.est_verrugas,
        est_pulgas: !!event.est_pulgas,
        est_secreciones: !!event.est_secreciones,
        est_lesiones: !!event.est_lesiones,
        est_alergias: !!event.est_alergias,
        est_manto: event.est_manto ?? '',
        checklist_items: event.checklist_items?.map(i => i.id) ?? [],
        // Vacuna
        vacuna_nombre: event.vacuna_nombre ?? '',
        vacuna_lote: event.vacuna_lote ?? '',
        vacuna_laboratorio: event.vacuna_laboratorio ?? '',
        // Desparasitación
        despa_producto: event.despa_producto ?? '',
        despa_via: event.despa_via ?? '',
        // Consulta
        consulta_temperatura: event.consulta_temperatura ?? '',
        consulta_motivo: event.consulta_motivo ?? '',
        consulta_diagnostico: event.consulta_diagnostico ?? '',
        consulta_medicamentos: event.consulta_medicamentos ?? '',
        consulta_proxima_cita: event.consulta_proxima_cita ?? '',
    });

    function submit(e) {
        e.preventDefault();
        put(route('events.update', event.id));
    }

    function toggleChecklist(id) {
        setData('checklist_items',
            data.checklist_items.includes(id)
                ? data.checklist_items.filter(x => x !== id)
                : [...data.checklist_items, id]
        );
    }

    return (
        <TenantLayout title={`Editar evento — ${typeName}`}>
            <div className="max-w-xl">
                <Link href={route('pets.show', event.pet_id)} className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 inline-block">
                    ← Volver a la mascota
                </Link>

                <form onSubmit={submit} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 px-2 py-0.5 rounded font-medium">{typeName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha *</label>
                            <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.fecha} onChange={e => setData('fecha', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Peso (kg)</label>
                            <input type="number" step="0.1" className="w-full border-gray-300 rounded-lg text-sm" value={data.peso} onChange={e => setData('peso', e.target.value)} />
                        </div>
                    </div>

                    {typeName === 'Estética' && (
                        <div className="space-y-3 border-t pt-3">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Hallazgos</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {['est_verrugas', 'est_pulgas', 'est_secreciones', 'est_lesiones', 'est_alergias'].map(field => (
                                    <label key={field} className="flex gap-2 items-center">
                                        <input type="checkbox" checked={data[field]} onChange={e => setData(field, e.target.checked)} className="rounded" />
                                        {field.replace('est_', '').charAt(0).toUpperCase() + field.replace('est_', '').slice(1)}
                                    </label>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Estado del manto</label>
                                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.est_manto} onChange={e => setData('est_manto', e.target.value)} />
                            </div>
                            {checklistItems.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-zinc-700 mb-2">Checklist</p>
                                    <div className="grid grid-cols-2 gap-1">
                                        {checklistItems.map(item => (
                                            <label key={item.id} className="flex gap-2 items-center text-sm">
                                                <input type="checkbox" checked={data.checklist_items.includes(item.id)} onChange={() => toggleChecklist(item.id)} className="rounded" />
                                                {item.nombre}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {typeName === 'Vacuna' && (
                        <div className="space-y-3 border-t pt-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre de la vacuna</label>
                                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.vacuna_nombre} onChange={e => setData('vacuna_nombre', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Lote</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm font-mono" value={data.vacuna_lote} onChange={e => setData('vacuna_lote', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Laboratorio</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" value={data.vacuna_laboratorio} onChange={e => setData('vacuna_laboratorio', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {typeName === 'Desparasitación' && (
                        <div className="grid grid-cols-2 gap-3 border-t pt-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Producto</label>
                                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.despa_producto} onChange={e => setData('despa_producto', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Vía</label>
                                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.despa_via} onChange={e => setData('despa_via', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {typeName === 'Consulta' && (
                        <div className="space-y-3 border-t pt-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Temperatura (°C)</label>
                                    <input type="number" step="0.1" className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_temperatura} onChange={e => setData('consulta_temperatura', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Próxima cita</label>
                                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_proxima_cita} onChange={e => setData('consulta_proxima_cita', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Motivo</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_motivo} onChange={e => setData('consulta_motivo', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Diagnóstico</label>
                                    <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_diagnostico} onChange={e => setData('consulta_diagnostico', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Medicamentos</label>
                                    <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.consulta_medicamentos} onChange={e => setData('consulta_medicamentos', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Notas</label>
                        <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.notas} onChange={e => setData('notas', e.target.value)} />
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 text-sm font-medium transition-colors disabled:opacity-50">
                        {processing ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </form>
            </div>
        </TenantLayout>
    );
}
