import TenantLayout from '@/Layouts/TenantLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const EMPTY = { nombre: '', tipo: 'porcentaje', valor: '', codigo: '', fecha_inicio: '', fecha_fin: '', activo: true };

export default function PosDiscounts({ discounts }) {
    const { flash } = usePage().props;
    const [editItem, setEditItem] = useState(null);
    const form = useForm(EMPTY);
    const editForm = useForm({});

    function openEdit(d) {
        setEditItem(d);
        editForm.setData({
            nombre:       d.nombre,
            tipo:         d.tipo,
            valor:        d.valor,
            codigo:       d.codigo ?? '',
            fecha_inicio: d.fecha_inicio ?? '',
            fecha_fin:    d.fecha_fin ?? '',
            activo:       d.activo,
        });
    }

    function submitNew(e) {
        e.preventDefault();
        form.post(route('pos.discounts.store'), { onSuccess: () => form.reset() });
    }

    function submitEdit(e) {
        e.preventDefault();
        editForm.put(route('pos.discounts.update', editItem.id), { onSuccess: () => setEditItem(null) });
    }

    function destroy(d) {
        if (confirm(`¿Eliminar descuento "${d.nombre}"?`)) {
            router.delete(route('pos.discounts.destroy', d.id));
        }
    }

    function toggleActive(d) {
        router.put(route('pos.discounts.update', d.id), { ...d, activo: !d.activo }, { preserveScroll: true });
    }

    return (
        <TenantLayout title="Descuentos POS">
            {flash?.success && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                    {flash.success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List */}
                <div className="lg:col-span-2 bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100">
                        <h3 className="font-semibold text-zinc-700">Descuentos configurados</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Aparecen en el POS al cobrar un ticket</p>
                    </div>

                    {discounts.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-zinc-400">
                            Sin descuentos. Crea uno con el formulario.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-50">
                            {discounts.map(d => (
                                <div key={d.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-zinc-800 text-sm">{d.nombre}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ring-1 font-medium ${d.tipo === 'porcentaje' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                                                {d.tipo === 'porcentaje' ? `${d.valor}%` : fmt(d.valor)}
                                            </span>
                                            {d.codigo && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-mono">{d.codigo}</span>
                                            )}
                                            {!d.activo && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-400">inactivo</span>
                                            )}
                                        </div>
                                        {(d.fecha_inicio || d.fecha_fin) && (
                                            <div className="text-xs text-zinc-400 mt-0.5">
                                                {d.fecha_inicio && `Desde ${d.fecha_inicio}`}
                                                {d.fecha_inicio && d.fecha_fin && ' · '}
                                                {d.fecha_fin && `Hasta ${d.fecha_fin}`}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => toggleActive(d)}
                                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${d.activo ? 'bg-blue-500' : 'bg-zinc-200'}`}
                                        title={d.activo ? 'Desactivar' : 'Activar'}>
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.activo ? 'translate-x-4' : ''}`} />
                                    </button>
                                    <button onClick={() => openEdit(d)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">editar</button>
                                    <button onClick={() => destroy(d)} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">eliminar</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* New form */}
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden h-fit">
                    <div className="px-4 py-3 border-b border-zinc-100">
                        <h3 className="font-semibold text-zinc-700">Nuevo descuento</h3>
                    </div>
                    <form onSubmit={submitNew} className="px-4 py-4 space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="ej. Descuento empleado"
                                value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} required />
                            {form.errors.nombre && <p className="text-rose-500 text-xs mt-0.5">{form.errors.nombre}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                                <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.tipo} onChange={e => form.setData('tipo', e.target.value)}>
                                    <option value="porcentaje">Porcentaje (%)</option>
                                    <option value="monto">Monto fijo ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">
                                    Valor * {form.data.tipo === 'porcentaje' ? '(%)' : '($)'}
                                </label>
                                <input type="number" step="0.01" min="0" className="w-full border-gray-300 rounded-lg text-sm"
                                    placeholder={form.data.tipo === 'porcentaje' ? '10' : '50'}
                                    value={form.data.valor} onChange={e => form.setData('valor', e.target.value)} required />
                                {form.errors.valor && <p className="text-rose-500 text-xs mt-0.5">{form.errors.valor}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Código (opcional)</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm font-mono" placeholder="ej. PROMO10"
                                value={form.data.codigo} onChange={e => form.setData('codigo', e.target.value.toUpperCase())} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Válido desde</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={form.data.fecha_inicio} onChange={e => form.setData('fecha_inicio', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Válido hasta</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={form.data.fecha_fin} onChange={e => form.setData('fecha_fin', e.target.value)} />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                            <input type="checkbox" checked={form.data.activo} onChange={e => form.setData('activo', e.target.checked)} />
                            Activo
                        </label>

                        <button type="submit" disabled={form.processing}
                            className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            {form.processing ? 'Guardando…' : '+ Crear descuento'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Edit modal */}
            {editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <form onSubmit={submitEdit} className="bg-white border border-zinc-200 rounded-xl shadow-lg p-6 w-96 space-y-4">
                        <h3 className="font-semibold text-zinc-800">Editar descuento</h3>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm"
                                value={editForm.data.nombre ?? ''} onChange={e => editForm.setData('nombre', e.target.value)} required />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo</label>
                                <select className="w-full border-gray-300 rounded-lg text-sm" value={editForm.data.tipo} onChange={e => editForm.setData('tipo', e.target.value)}>
                                    <option value="porcentaje">Porcentaje (%)</option>
                                    <option value="monto">Monto fijo ($)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Valor *</label>
                                <input type="number" step="0.01" min="0" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={editForm.data.valor ?? ''} onChange={e => editForm.setData('valor', e.target.value)} required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Código</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                value={editForm.data.codigo ?? ''} onChange={e => editForm.setData('codigo', e.target.value.toUpperCase())} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Válido desde</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={editForm.data.fecha_inicio ?? ''} onChange={e => editForm.setData('fecha_inicio', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Válido hasta</label>
                                <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={editForm.data.fecha_fin ?? ''} onChange={e => editForm.setData('fecha_fin', e.target.value)} />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                            <input type="checkbox" checked={!!editForm.data.activo} onChange={e => editForm.setData('activo', e.target.checked)} />
                            Activo
                        </label>

                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={() => setEditItem(null)}
                                className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm hover:bg-zinc-50 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={editForm.processing}
                                className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                                {editForm.processing ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </TenantLayout>
    );
}
