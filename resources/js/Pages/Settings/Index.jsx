import TenantLayout from '@/Layouts/TenantLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function CatalogImport() {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    async function handleImport() {
        if (!file) return;
        setLoading(true);
        setResult(null);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { default: axios } = await import('axios');
            const res = await axios.post(route('settings.catalog.import'), fd);
            setResult(res.data);
            if (res.data.created > 0) router.reload({ only: ['categories', 'items'] });
        } catch (e) {
            setResult({ error: e.response?.data?.error ?? 'Error al importar.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="flex gap-2">
                <a href={route('settings.catalog.sample')}
                    className="inline-flex items-center gap-1.5 border border-zinc-200 text-zinc-600 text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">
                    ↓ Descargar ejemplo CSV
                </a>
                <button onClick={() => { setOpen(true); setResult(null); setFile(null); }}
                    className="inline-flex items-center gap-1.5 border border-zinc-200 text-zinc-600 text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">
                    ↑ Importar CSV
                </button>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-96 space-y-4">
                        <h3 className="font-semibold text-zinc-800">Importar catálogo desde CSV</h3>
                        <p className="text-xs text-zinc-500">
                            El CSV debe tener las columnas: <code className="bg-zinc-100 px-1 rounded">categoria, nombre, tipo, precio, costo, sku, stock</code>.
                            Descarga el ejemplo para ver el formato correcto.
                        </p>
                        <input type="file" accept=".csv,text/csv"
                            onChange={e => { setFile(e.target.files[0]); setResult(null); }}
                            className="w-full text-sm text-zinc-600" />
                        {result && !result.error && (
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-emerald-700">✓ {result.created} artículo{result.created !== 1 ? 's' : ''} creado{result.created !== 1 ? 's' : ''}.</p>
                                {result.errors?.length > 0 && (
                                    <div className="bg-rose-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                                        {result.errors.map((e, i) => <p key={i} className="text-xs text-rose-600">{e}</p>)}
                                    </div>
                                )}
                            </div>
                        )}
                        {result?.error && <p className="text-sm text-rose-600">{result.error}</p>}
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setOpen(false)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cerrar</button>
                            <button onClick={handleImport} disabled={!file || loading}
                                className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                                {loading ? 'Importando…' : 'Importar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function CatalogTab({ categories, items }) {
    const catForm = useForm({ nombre: '', orden: '', es_grooming: false });
    const itemForm = useForm({ categoria_id: categories[0]?.id ?? '', sku: '', nombre: '', tipo: 'servicio', precio: '', costo: '', stock: '' });
    const [editCat, setEditCat] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const editCatForm = useForm({});
    const editItemForm = useForm({});

    function openEditCat(c) {
        setEditCat(c);
        editCatForm.setData({ nombre: c.nombre, orden: c.orden ?? '', activo: c.activo, es_grooming: c.es_grooming });
    }
    function openEditItem(i) {
        setEditItem(i);
        editItemForm.setData({ categoria_id: i.categoria_id, sku: i.sku ?? '', nombre: i.nombre, tipo: i.tipo, precio: i.precio, costo: i.costo ?? '', stock: i.stock ?? '', activo: i.activo });
    }

    return (
        <div className="space-y-4">
        <CatalogImport />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-700">Categorías del catálogo</h3>
                </div>
                <div className="divide-y divide-zinc-50">
                    {categories.map(c => (
                        <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 text-sm">
                                <span className="font-medium text-zinc-800">{c.nombre}</span>
                                {c.es_grooming && <span className="ml-2 text-xs bg-violet-50 text-violet-700 ring-1 ring-violet-200 px-1.5 py-0.5 rounded-full">grooming</span>}
                                {!c.activo && <span className="ml-2 text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">inactivo</span>}
                            </div>
                            <button onClick={() => openEditCat(c)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">editar</button>
                            <button onClick={() => { if (confirm('¿Eliminar?')) router.delete(route('settings.catalog.categories.destroy', c.id)); }} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                        </div>
                    ))}
                </div>
                <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                    <form onSubmit={e => { e.preventDefault(); catForm.post(route('settings.catalog.categories.store'), { onSuccess: () => catForm.reset() }); }} className="flex gap-2">
                        <input className="flex-1 border-gray-300 rounded-lg text-sm" placeholder="Nueva categoría" value={catForm.data.nombre} onChange={e => catForm.setData('nombre', e.target.value)} />
                        <button type="submit" disabled={catForm.processing} className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">+ Agregar</button>
                    </form>
                </div>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-700">Artículos del catálogo</h3>
                </div>
                <div className="divide-y divide-zinc-50 max-h-80 overflow-y-auto">
                    {items.map(i => (
                        <div key={i.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 text-sm">
                                <span className="font-medium text-zinc-800">{i.nombre}</span>
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ring-1 ${i.tipo === 'servicio' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>{i.tipo}</span>
                                {!i.activo && <span className="ml-1 text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">inactivo</span>}
                                <div className="text-xs text-zinc-500 mt-0.5">
                                    {i.categoria?.nombre} · {fmt(i.precio)}
                                    {i.sku ? ` · SKU: ${i.sku}` : ''}
                                    {i.tipo === 'producto' ? ` · stock: ${i.stock ?? 0}` : ''}
                                </div>
                            </div>
                            <button onClick={() => openEditItem(i)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">editar</button>
                            <button onClick={() => { if (confirm('¿Eliminar?')) router.delete(route('settings.catalog.items.destroy', i.id)); }} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                        </div>
                    ))}
                </div>
                <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                    <form onSubmit={e => { e.preventDefault(); itemForm.post(route('settings.catalog.items.store'), { onSuccess: () => itemForm.reset() }); }} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <select className="border-gray-300 rounded-lg text-sm" value={itemForm.data.categoria_id} onChange={e => itemForm.setData('categoria_id', e.target.value)}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <select className="border-gray-300 rounded-lg text-sm" value={itemForm.data.tipo} onChange={e => itemForm.setData('tipo', e.target.value)}>
                                <option value="servicio">Servicio</option>
                                <option value="producto">Producto</option>
                            </select>
                            <input className="col-span-2 border-gray-300 rounded-lg text-sm" placeholder="Nombre del artículo *" value={itemForm.data.nombre} onChange={e => itemForm.setData('nombre', e.target.value)} />
                            <input type="number" step="0.01" className="border-gray-300 rounded-lg text-sm" placeholder="Precio *" value={itemForm.data.precio} onChange={e => itemForm.setData('precio', e.target.value)} />
                            {itemForm.data.tipo === 'producto' && (
                                <input type="number" className="border-gray-300 rounded-lg text-sm" placeholder="Stock inicial" value={itemForm.data.stock} onChange={e => itemForm.setData('stock', e.target.value)} />
                            )}
                        </div>
                        <button type="submit" disabled={itemForm.processing} className="w-full bg-zinc-900 text-white py-1.5 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">+ Agregar artículo</button>
                    </form>
                </div>
            </div>

            {editCat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form onSubmit={e => { e.preventDefault(); editCatForm.put(route('settings.catalog.categories.update', editCat.id), { onSuccess: () => setEditCat(null) }); }} className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-80 space-y-3">
                        <h3 className="font-semibold text-zinc-800">Editar categoría</h3>
                        <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Nombre" value={editCatForm.data.nombre ?? ''} onChange={e => editCatForm.setData('nombre', e.target.value)} />
                        <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!editCatForm.data.activo} onChange={e => editCatForm.setData('activo', e.target.checked)} /> Activo</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditCat(null)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={editCatForm.processing} className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            {editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form onSubmit={e => { e.preventDefault(); editItemForm.put(route('settings.catalog.items.update', editItem.id), { onSuccess: () => setEditItem(null) }); }} className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-80 space-y-3">
                        <h3 className="font-semibold text-zinc-800">Editar artículo</h3>
                        <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Nombre" value={editItemForm.data.nombre ?? ''} onChange={e => editItemForm.setData('nombre', e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" step="0.01" className="border-gray-300 rounded-lg text-sm" placeholder="Precio" value={editItemForm.data.precio ?? ''} onChange={e => editItemForm.setData('precio', e.target.value)} />
                            <input className="border-gray-300 rounded-lg text-sm font-mono" placeholder="SKU" value={editItemForm.data.sku ?? ''} onChange={e => editItemForm.setData('sku', e.target.value)} />
                        </div>
                        {editItem?.tipo === 'producto' && (
                            <input type="number" className="w-full border-gray-300 rounded-lg text-sm" placeholder="Stock" value={editItemForm.data.stock ?? ''} onChange={e => editItemForm.setData('stock', e.target.value)} />
                        )}
                        <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!editItemForm.data.activo} onChange={e => editItemForm.setData('activo', e.target.checked)} /> Activo</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditItem(null)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={editItemForm.processing} className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
        </div>
    );
}

function GroomingTab({ stations, checklistItems }) {
    return (
        <div className="space-y-6">
            <StationsSection stations={stations} />
            <ChecklistSection checklistItems={checklistItems} />
        </div>
    );
}

function ChecklistSection({ checklistItems }) {
    const form = useForm({ nombre: '' });
    const [editItem, setEditItem] = useState(null);
    const editForm = useForm({});

    function openEdit(item) {
        setEditItem(item);
        editForm.setData({ nombre: item.nombre, activo: item.activo });
    }

    return (
        <div className="max-w-md bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100">
                <h3 className="font-semibold text-zinc-700">Checklist de servicio</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Ítems que se pueden marcar al completar una cita</p>
            </div>
            <div className="divide-y divide-zinc-50">
                {checklistItems.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                        <span className="flex-1 text-zinc-800">{item.nombre}</span>
                        {!item.activo && <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">inactivo</span>}
                        <button onClick={() => openEdit(item)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">editar</button>
                        <button onClick={() => { if (confirm('¿Eliminar ítem?')) router.delete(route('settings.grooming.checklist.destroy', item.id)); }} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                    </div>
                ))}
                {checklistItems.length === 0 && <p className="px-4 py-3 text-sm text-zinc-400">Sin ítems registrados.</p>}
            </div>
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                <form onSubmit={e => { e.preventDefault(); form.post(route('settings.grooming.checklist.store'), { onSuccess: () => form.reset() }); }} className="flex gap-2">
                    <input className="flex-1 border-gray-300 rounded-lg text-sm" placeholder="Ej: Baño, Corte de pelo..." value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} />
                    <button type="submit" disabled={form.processing} className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">+ Agregar</button>
                </form>
            </div>
            {editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form onSubmit={e => { e.preventDefault(); editForm.put(route('settings.grooming.checklist.update', editItem.id), { onSuccess: () => setEditItem(null) }); }} className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-80 space-y-3">
                        <h3 className="font-semibold text-zinc-800">Editar ítem</h3>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={editForm.data.nombre ?? ''} onChange={e => editForm.setData('nombre', e.target.value)} />
                        <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!editForm.data.activo} onChange={e => editForm.setData('activo', e.target.checked)} /> Activo</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditItem(null)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={editForm.processing} className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function StationsSection({ stations }) {
    const form = useForm({ nombre: '', orden: '' });
    const [editStation, setEditStation] = useState(null);
    const editForm = useForm({});

    function openEdit(s) {
        setEditStation(s);
        editForm.setData({ nombre: s.nombre, orden: s.orden ?? '', activo: s.activo });
    }

    return (
        <div className="max-w-md bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100">
                <h3 className="font-semibold text-zinc-700">Estaciones de grooming</h3>
            </div>
            <div className="divide-y divide-zinc-50">
                {stations.map(s => (
                    <div key={s.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                        <span className="flex-1 text-zinc-800">{s.nombre}</span>
                        {!s.activo && <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">inactiva</span>}
                        <button onClick={() => openEdit(s)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">editar</button>
                        <button onClick={() => { if (confirm('¿Eliminar estación?')) router.delete(route('settings.grooming.stations.destroy', s.id)); }} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                    </div>
                ))}
                {stations.length === 0 && <p className="px-4 py-3 text-sm text-zinc-400">Sin estaciones registradas.</p>}
            </div>
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                <form onSubmit={e => { e.preventDefault(); form.post(route('settings.grooming.stations.store'), { onSuccess: () => form.reset() }); }} className="flex gap-2">
                    <input className="flex-1 border-gray-300 rounded-lg text-sm" placeholder="Nueva estación" value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} />
                    <button type="submit" disabled={form.processing} className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">+ Agregar</button>
                </form>
            </div>
            {editStation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form onSubmit={e => { e.preventDefault(); editForm.put(route('settings.grooming.stations.update', editStation.id), { onSuccess: () => setEditStation(null) }); }} className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-80 space-y-3">
                        <h3 className="font-semibold text-zinc-800">Editar estación</h3>
                        <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Nombre" value={editForm.data.nombre ?? ''} onChange={e => editForm.setData('nombre', e.target.value)} />
                        <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!editForm.data.activo} onChange={e => editForm.setData('activo', e.target.checked)} /> Activa</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEditStation(null)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                            <button type="submit" disabled={editForm.processing} className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function WalksConfigTab({ walkConfig }) {
    const form = useForm({
        horas_anticipacion: walkConfig?.horas_anticipacion ?? 2,
        dias_adelante: walkConfig?.dias_adelante ?? 14,
    });

    function handleSubmit(e) {
        e.preventDefault();
        form.post(route('settings.walk.update'));
    }

    return (
        <div className="max-w-md bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-5">
            <div>
                <h3 className="font-semibold text-zinc-700">Restricciones de reserva</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Controla con cuánta anticipación pueden registrarse los clientes y cuántos días pueden ver hacia adelante.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Horas mínimas de anticipación
                    </label>
                    <p className="text-xs text-zinc-400 mb-2">Los clientes no podrán registrarse en paseos que comiencen dentro de este número de horas.</p>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" max="72"
                            className="w-24 border-gray-300 rounded-lg text-sm"
                            value={form.data.horas_anticipacion}
                            onChange={e => form.setData('horas_anticipacion', parseInt(e.target.value) || 0)} />
                        <span className="text-sm text-zinc-500">horas</span>
                    </div>
                    {form.errors.horas_anticipacion && <p className="text-rose-500 text-xs mt-1">{form.errors.horas_anticipacion}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Días máximos hacia adelante
                    </label>
                    <p className="text-xs text-zinc-400 mb-2">Los clientes solo verán paseos disponibles dentro de este rango desde hoy.</p>
                    <div className="flex items-center gap-2">
                        <input type="number" min="1" max="90"
                            className="w-24 border-gray-300 rounded-lg text-sm"
                            value={form.data.dias_adelante}
                            onChange={e => form.setData('dias_adelante', parseInt(e.target.value) || 1)} />
                        <span className="text-sm text-zinc-500">días</span>
                    </div>
                    {form.errors.dias_adelante && <p className="text-rose-500 text-xs mt-1">{form.errors.dias_adelante}</p>}
                </div>
                <button type="submit" disabled={form.processing}
                    className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                    {form.processing ? 'Guardando…' : 'Guardar configuración'}
                </button>
            </form>
        </div>
    );
}

function PaymentMethodsTab({ paymentMethods }) {
    const form = useForm({ nombre: '', orden: '' });

    return (
        <div className="max-w-md bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100">
                <h3 className="font-semibold text-zinc-700">Métodos de pago</h3>
            </div>
            <div className="divide-y divide-zinc-50">
                {paymentMethods.map(m => (
                    <div key={m.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                        <span className="flex-1 text-zinc-800">{m.nombre}</span>
                        {!m.activo && <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">inactivo</span>}
                        <button onClick={() => { if (confirm('¿Eliminar?')) router.delete(route('settings.payment_methods.destroy', m.id)); }} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                    </div>
                ))}
            </div>
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                <form onSubmit={e => { e.preventDefault(); form.post(route('settings.payment_methods.store'), { onSuccess: () => form.reset() }); }} className="flex gap-2">
                    <input className="flex-1 border-gray-300 rounded-lg text-sm" placeholder="Nuevo método de pago" value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} />
                    <button type="submit" disabled={form.processing} className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">+ Agregar</button>
                </form>
            </div>
        </div>
    );
}

function TicketConfigTab({ ticketConfig }) {
    const [preview, setPreview] = useState(ticketConfig);
    const [logoFile, setLogoFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [ok, setOk] = useState(false);

    function handleLogoChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        setLogoFile(file);
        setPreview(p => ({ ...p, logo_url: URL.createObjectURL(file) }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setOk(false);
        const fd = new FormData();
        if (logoFile) fd.append('logo', logoFile);
        fd.append('color_primario', preview.color_primario);
        fd.append('color_texto', preview.color_texto);
        fd.append('color_fondo', preview.color_fondo);
        fd.append('mensaje_pie', preview.mensaje_pie ?? '');
        fd.append('_method', 'POST');
        try {
            const { default: axios } = await import('axios');
            await axios.post(route('settings.ticket.update'), fd, {
                headers: { 'X-CSRF-TOKEN': document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '' },
            });
            setOk(true);
        } finally {
            setSaving(false);
        }
    }

    const p = preview;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleSubmit} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-zinc-700">Personalización del ticket público</h3>
                <div>
                    <label className="block text-sm text-zinc-600 mb-1">Logo de la empresa</label>
                    {p.logo_url && <img src={p.logo_url} alt="Logo" className="h-12 mb-2 rounded object-contain" />}
                    <input type="file" accept="image/*" onChange={handleLogoChange}
                        className="text-sm text-zinc-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { key: 'color_primario', label: 'Color principal' },
                        { key: 'color_texto', label: 'Color de texto' },
                        { key: 'color_fondo', label: 'Fondo' },
                    ].map(({ key, label }) => (
                        <div key={key}>
                            <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={p[key]}
                                    onChange={e => setPreview(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="h-9 w-12 cursor-pointer rounded border border-zinc-200" />
                                <span className="text-xs font-mono text-zinc-500">{p[key]}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div>
                    <label className="block text-sm text-zinc-600 mb-1">Mensaje al pie del ticket</label>
                    <textarea rows={3} className="w-full border-gray-300 rounded-lg text-sm"
                        placeholder="Ej: ¡Gracias por confiar en nosotros! 🐾"
                        value={p.mensaje_pie ?? ''}
                        onChange={e => setPreview(prev => ({ ...prev, mensaje_pie: e.target.value }))} />
                </div>
                <button type="submit" disabled={saving}
                    className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Guardando…' : ok ? '✓ Guardado' : 'Guardar configuración'}
                </button>
            </form>

            <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Vista previa</p>
                <div style={{ background: p.color_fondo, color: p.color_texto, borderRadius: '0.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', overflow: 'hidden', fontSize: '14px' }}>
                    <div style={{ background: p.color_primario, padding: '1.25rem', textAlign: 'center' }}>
                        {p.logo_url && <img src={p.logo_url} alt="Logo" style={{ maxHeight: '44px', maxWidth: '140px', objectFit: 'contain', margin: '0 auto 0.5rem', display: 'block' }} />}
                        <div style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.8 }}>Ticket de venta</div>
                        <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace' }}>#001</div>
                        <div style={{ color: '#fff', fontSize: '0.7rem', opacity: 0.7 }}>Hoy · 10:00 AM</div>
                    </div>
                    <div style={{ padding: '1rem' }}>
                        <div style={{ borderBottom: `1px solid ${p.color_primario}22`, paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', opacity: 0.5 }}>CLIENTE</div>
                        <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Ejemplo Cliente</div>
                        {[{ nombre: 'Baño y corte', cantidad: 1, precio: 350, subtotal: 350 }, { nombre: 'Desparasitación', cantidad: 1, precio: 120, subtotal: 120 }].map((l, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: `1px solid ${p.color_primario}11` }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{l.nombre}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{l.cantidad} × ${l.precio}</div>
                                </div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>${l.subtotal}</div>
                            </div>
                        ))}
                        <div style={{ background: `${p.color_primario}0d`, borderRadius: '0.4rem', padding: '0.5rem 0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Total</span>
                            <span style={{ fontFamily: 'monospace', color: p.color_primario }}>$470.00</span>
                        </div>
                    </div>
                    {p.mensaje_pie && (
                        <div style={{ background: `${p.color_primario}0d`, padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', opacity: 0.7, borderTop: `1px solid ${p.color_primario}22` }}>
                            {p.mensaje_pie}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const MODULES = [
    { key: 'crm',          label: 'Clientes / CRM' },
    { key: 'pos',          label: 'POS' },
    { key: 'memberships',  label: 'Membresías' },
    { key: 'hotel',        label: 'Hotel' },
    { key: 'paseos',       label: 'Paseos' },
    { key: 'grooming',     label: 'Grooming' },
    { key: 'veterinaria',  label: 'Veterinaria' },
];

function ModuleCheckboxes({ permisos, onChange }) {
    const toggle = (key) => {
        const next = permisos.includes(key) ? permisos.filter(k => k !== key) : [...permisos, key];
        onChange(next);
    };
    return (
        <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">Acceso a módulos <span className="text-zinc-400 font-normal">(vacío = acceso total)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
                {MODULES.map(m => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" className="rounded border-zinc-300"
                            checked={permisos.includes(m.key)}
                            onChange={() => toggle(m.key)} />
                        <span className="text-sm text-zinc-600">{m.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

const TIPO_LABELS = {
    perro:   'Perro',
    gato:    'Gato',
    roedor:  'Roedor',
    reptil:  'Reptil',
    otro:    'Otro',
};

const TIPO_COLORS = {
    perro:  'bg-amber-50 text-amber-700 ring-amber-200',
    gato:   'bg-sky-50 text-sky-700 ring-sky-200',
    roedor: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    reptil: 'bg-lime-50 text-lime-700 ring-lime-200',
    otro:   'bg-zinc-100 text-zinc-500 ring-zinc-200',
};

function RazasSection({ razas }) {
    const form = useForm({ nombre: '', tipo: 'perro' });

    return (
        <div className="max-w-md bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100">
                <h3 className="font-semibold text-zinc-700">Razas personalizadas</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Se mostrarán junto a las razas comunes al registrar mascotas, filtradas por especie</p>
            </div>
            <div className="divide-y divide-zinc-50">
                {razas.map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ring-1 shrink-0 ${TIPO_COLORS[r.tipo] ?? TIPO_COLORS.otro}`}>
                            {TIPO_LABELS[r.tipo] ?? r.tipo}
                        </span>
                        <span className="flex-1 text-zinc-800">{r.nombre}</span>
                        <button
                            onClick={() => { if (confirm(`¿Eliminar "${r.nombre}"?`)) router.delete(route('settings.razas.destroy', r.id)); }}
                            className="text-xs text-rose-500 hover:text-rose-700 transition-colors">
                            eliminar
                        </button>
                    </div>
                ))}
                {razas.length === 0 && <p className="px-4 py-3 text-sm text-zinc-400">Sin razas personalizadas.</p>}
            </div>
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                <form onSubmit={e => { e.preventDefault(); form.post(route('settings.razas.store'), { onSuccess: () => form.reset() }); }} className="flex gap-2">
                    <select className="border-gray-300 rounded-lg text-sm" value={form.data.tipo} onChange={e => form.setData('tipo', e.target.value)}>
                        <option value="perro">Perro</option>
                        <option value="gato">Gato</option>
                        <option value="roedor">Roedor</option>
                        <option value="reptil">Reptil</option>
                        <option value="otro">Otro</option>
                    </select>
                    <input className="flex-1 border-gray-300 rounded-lg text-sm" placeholder="Ej: Criollo Pitbull" value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} />
                    <button type="submit" disabled={form.processing} className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">+ Agregar</button>
                </form>
            </div>
        </div>
    );
}

function TeamTab({ teamMembers, currentUserId }) {
    const newForm = useForm({ nombre: '', apellido: '', email: '', role: 'colaborador', password: '', permisos_modulos: [] });
    const [editUser, setEditUser] = useState(null);
    const editForm = useForm({});
    const [pwdUser, setPwdUser] = useState(null);
    const pwdForm = useForm({ password: '' });

    function openEdit(u) {
        setEditUser(u);
        editForm.setData({ nombre: u.nombre, apellido: u.apellido ?? '', email: u.email, role: u.role, activo: u.activo, permisos_modulos: u.permisos_modulos ?? [] });
    }

    function roleLabel(role) {
        return role === 'tenant_admin' ? 'Administrador' : 'Colaborador';
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-700">Usuarios del equipo</h3>
                </div>
                <div className="divide-y divide-zinc-50">
                    {teamMembers.map(u => (
                        <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0">
                                {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-zinc-800 truncate">
                                    {u.nombre} {u.apellido}
                                    {u.id === currentUserId && <span className="ml-1.5 text-xs text-zinc-400">(tú)</span>}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">{u.email}</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ring-1 shrink-0 ${u.role === 'tenant_admin' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-sky-50 text-sky-700 ring-sky-200'}`}>
                                {roleLabel(u.role)}
                            </span>
                            {!u.activo && <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full ring-1 ring-zinc-200 shrink-0">inactivo</span>}
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => openEdit(u)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">editar</button>
                                <button onClick={() => { setPwdUser(u); pwdForm.reset(); }} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">contraseña</button>
                                {u.id !== currentUserId && (
                                    <button onClick={() => { if (confirm('¿Eliminar usuario?')) router.delete(route('settings.team.destroy', u.id)); }}
                                        className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                <h3 className="font-semibold text-zinc-700 mb-4">Agregar usuario</h3>
                <form onSubmit={e => { e.preventDefault(); newForm.post(route('settings.team.store'), { onSuccess: () => newForm.reset() }); }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={newForm.data.nombre} onChange={e => newForm.setData('nombre', e.target.value)} />
                        {newForm.errors.nombre && <p className="text-rose-500 text-xs mt-0.5">{newForm.errors.nombre}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Apellido</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={newForm.data.apellido} onChange={e => newForm.setData('apellido', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Correo electrónico *</label>
                        <input type="email" className="w-full border-gray-300 rounded-lg text-sm" value={newForm.data.email} onChange={e => newForm.setData('email', e.target.value)} />
                        {newForm.errors.email && <p className="text-rose-500 text-xs mt-0.5">{newForm.errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Rol *</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm" value={newForm.data.role} onChange={e => newForm.setData('role', e.target.value)}>
                            <option value="colaborador">Colaborador</option>
                            <option value="tenant_admin">Administrador</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Contraseña *</label>
                        <input type="password" className="w-full border-gray-300 rounded-lg text-sm" value={newForm.data.password} onChange={e => newForm.setData('password', e.target.value)} />
                        {newForm.errors.password && <p className="text-rose-500 text-xs mt-0.5">{newForm.errors.password}</p>}
                    </div>
                    {newForm.data.role === 'colaborador' && (
                        <div className="sm:col-span-2">
                            <ModuleCheckboxes
                                permisos={newForm.data.permisos_modulos}
                                onChange={v => newForm.setData('permisos_modulos', v)} />
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <button type="submit" disabled={newForm.processing}
                            className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            {newForm.processing ? 'Creando…' : 'Crear usuario'}
                        </button>
                    </div>
                </form>
            </div>

            {editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="font-semibold text-zinc-800">Editar usuario</h3>
                        <form onSubmit={e => { e.preventDefault(); editForm.put(route('settings.team.update', editUser.id), { onSuccess: () => setEditUser(null) }); }}
                            className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" value={editForm.data.nombre ?? ''} onChange={e => editForm.setData('nombre', e.target.value)} />
                                    {editForm.errors.nombre && <p className="text-rose-500 text-xs mt-0.5">{editForm.errors.nombre}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Apellido</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm" value={editForm.data.apellido ?? ''} onChange={e => editForm.setData('apellido', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Correo electrónico *</label>
                                <input type="email" className="w-full border-gray-300 rounded-lg text-sm" value={editForm.data.email ?? ''} onChange={e => editForm.setData('email', e.target.value)} />
                                {editForm.errors.email && <p className="text-rose-500 text-xs mt-0.5">{editForm.errors.email}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Rol *</label>
                                    <select className="w-full border-gray-300 rounded-lg text-sm" value={editForm.data.role ?? ''} onChange={e => editForm.setData('role', e.target.value)}>
                                        <option value="colaborador">Colaborador</option>
                                        <option value="tenant_admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Estado</label>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input type="checkbox" className="rounded border-zinc-300"
                                            checked={editForm.data.activo ?? true}
                                            onChange={e => editForm.setData('activo', e.target.checked)} />
                                        <span className="text-sm text-zinc-600">Activo</span>
                                    </label>
                                </div>
                            </div>
                            {editForm.data.role === 'colaborador' && (
                                <ModuleCheckboxes
                                    permisos={editForm.data.permisos_modulos ?? []}
                                    onChange={v => editForm.setData('permisos_modulos', v)} />
                            )}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setEditUser(null)}
                                    className="flex-1 border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                                <button type="submit" disabled={editForm.processing}
                                    className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                                    {editForm.processing ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {pwdUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
                        <h3 className="font-semibold text-zinc-800">Cambiar contraseña</h3>
                        <p className="text-sm text-zinc-500">{pwdUser.nombre} {pwdUser.apellido}</p>
                        <form onSubmit={e => { e.preventDefault(); pwdForm.put(route('settings.team.password', pwdUser.id), { onSuccess: () => { setPwdUser(null); pwdForm.reset(); } }); }}
                            className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Nueva contraseña *</label>
                                <input type="password" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={pwdForm.data.password} onChange={e => pwdForm.setData('password', e.target.value)} />
                                {pwdForm.errors.password && <p className="text-rose-500 text-xs mt-0.5">{pwdForm.errors.password}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setPwdUser(null)}
                                    className="flex-1 border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                                <button type="submit" disabled={pwdForm.processing}
                                    className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                                    {pwdForm.processing ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function LinksTab({ slug }) {
    const [copied, setCopied] = useState(null);

    function copy(key, url) {
        navigator.clipboard.writeText(url);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    }

    const links = [
        {
            key: 'staff',
            label: 'Login de staff',
            description: 'Acceso para colaboradores y admins del negocio',
            url: route('tenant.login', slug),
        },
        {
            key: 'portal',
            label: 'Portal de clientes',
            description: 'Acceso para dueños de mascotas a su historial y citas',
            url: route('portal.login', slug),
        },
        {
            key: 'landing',
            label: 'Página pública',
            description: 'Tu página de presentación visible para cualquier visitante',
            url: route('studio.landing', slug),
        },
    ];

    return (
        <div className="max-w-xl space-y-3">
            {links.map(l => (
                <div key={l.key} className="bg-white border border-zinc-100 shadow-sm rounded-xl px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800">{l.label}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{l.description}</p>
                        <p className="text-xs font-mono text-zinc-500 mt-1 truncate">{l.url}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <a href={l.url} target="_blank" rel="noreferrer"
                            className="text-xs border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">
                            Abrir
                        </a>
                        <button onClick={() => copy(l.key, l.url)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${copied === l.key ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                            {copied === l.key ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function SettingsIndex({ categories, items, paymentMethods, stations, checklistItems, ticketConfig, walkConfig, teamMembers, razas }) {
    const { auth, tenant } = usePage().props;
    const [tab, setTab] = useState('crm');

    const tabs = [
        { id: 'crm', label: 'CRM' },
        { id: 'grooming', label: 'Grooming' },
        { id: 'payments', label: 'Métodos de pago' },
        { id: 'ticket', label: 'Ticket' },
        { id: 'walks', label: 'Paseos' },
        { id: 'team', label: 'Equipo' },
        { id: 'links', label: 'Links' },
    ];

    return (
        <TenantLayout title="Configuración">
            <div className="flex gap-1 mb-6 border-b border-zinc-200 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'crm' && <RazasSection razas={razas ?? []} />}
            {tab === 'grooming' && <GroomingTab stations={stations ?? []} checklistItems={checklistItems ?? []} />}
            {tab === 'payments' && <PaymentMethodsTab paymentMethods={paymentMethods} />}
            {tab === 'ticket' && <TicketConfigTab ticketConfig={ticketConfig ?? { color_primario: '#18181b', color_texto: '#1f2937', color_fondo: '#ffffff', mensaje_pie: '', logo_url: null }} />}
            {tab === 'walks' && <WalksConfigTab walkConfig={walkConfig ?? { horas_anticipacion: 2, dias_adelante: 14 }} />}
            {tab === 'team' && <TeamTab teamMembers={teamMembers ?? []} currentUserId={auth.user?.id} />}
            {tab === 'links' && <LinksTab slug={tenant?.slug} />}
        </TenantLayout>
    );
}
