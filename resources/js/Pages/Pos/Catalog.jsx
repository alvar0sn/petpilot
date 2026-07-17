import TenantLayout from '@/Layouts/TenantLayout';
import { router, useForm } from '@inertiajs/react';
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

export default function PosCatalog({ categories, items }) {
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
        <TenantLayout title="Catálogo POS">
            <div className="space-y-4">
                <CatalogImport />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Categories */}
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-700">Categorías</h3>
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

                    {/* Items */}
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-700">Artículos</h3>
                        </div>
                        <div className="divide-y divide-zinc-50 max-h-80 overflow-y-auto">
                            {items.map(i => (
                                <div key={i.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 text-sm">
                                        <span className="font-medium text-zinc-800">{i.nombre}</span>
                                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ring-1 ${i.tipo === 'servicio' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>{i.tipo}</span>
                                        {!i.activo && <span className="ml-1 text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">inactivo</span>}
                                        <div className="text-xs text-zinc-500 mt-0.5">{i.categoria?.nombre} · {fmt(i.precio)}{i.tipo === 'producto' ? ` · stock: ${i.stock}` : ''}</div>
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
                            <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm" placeholder="Precio" value={editItemForm.data.precio ?? ''} onChange={e => editItemForm.setData('precio', e.target.value)} />
                            <label className="flex gap-2 text-sm items-center"><input type="checkbox" checked={!!editItemForm.data.activo} onChange={e => editItemForm.setData('activo', e.target.checked)} /> Activo</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setEditItem(null)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">Cancelar</button>
                                <button type="submit" disabled={editItemForm.processing} className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">Guardar</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </TenantLayout>
    );
}
