import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const tipoLabel = { grupal: 'Grupal', privado: 'Privado' };

function NewRateForm() {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: '', tipo: 'grupal', precio: '',
    });

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-zinc-700">Nueva tarifa</h3>
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} placeholder="Ej: Paseo talla G" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.tipo} onChange={e => setData('tipo', e.target.value)}>
                        <option value="grupal">Grupal</option>
                        <option value="privado">Privado</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Precio *</label>
                    <input type="number" step="0.01" min="0" className="w-full border-gray-300 rounded-lg text-sm" value={data.precio} onChange={e => setData('precio', e.target.value)} />
                    {errors.precio && <p className="text-red-500 text-xs mt-1">{errors.precio}</p>}
                </div>
            </div>
            <p className="text-xs text-zinc-400">Se creará automáticamente un artículo en el catálogo de POS para cobrar esta tarifa.</p>
            <button onClick={() => post(route('walks.rates.store'), { onSuccess: reset })}
                disabled={processing}
                className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {processing ? 'Guardando...' : 'Crear tarifa'}
            </button>
        </div>
    );
}

function EditRateForm({ rate, onCancel }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: rate.nombre, tipo: rate.tipo, precio: rate.precio, activa: rate.activa,
    });

    return (
        <div className="bg-white border-2 border-zinc-200 shadow-sm rounded-xl p-4 space-y-3">
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.tipo} onChange={e => setData('tipo', e.target.value)}>
                        <option value="grupal">Grupal</option>
                        <option value="privado">Privado</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Precio *</label>
                    <input type="number" step="0.01" min="0" className="w-full border-gray-300 rounded-lg text-sm" value={data.precio} onChange={e => setData('precio', e.target.value)} />
                </div>
            </div>
            <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.activa} onChange={e => setData('activa', e.target.checked)} className="rounded text-zinc-900" />
                <span className="text-sm text-zinc-700">Tarifa activa</span>
            </label>
            <div className="flex gap-2">
                <button onClick={() => put(route('walks.rates.update', rate.id), { onSuccess: onCancel })} disabled={processing}
                    className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                    Guardar
                </button>
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">Cancelar</button>
            </div>
        </div>
    );
}

export default function WalksConfig({ rates }) {
    const [editingRateId, setEditingRateId] = useState(null);

    return (
        <TenantLayout title="Paseos — Tarifas">
            <div className="mb-4">
                <Link href={route('walks.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Paseos</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="font-semibold text-zinc-800">Tarifas de paseo</h2>
                    {rates.map(rate => (
                        editingRateId === rate.id ? (
                            <EditRateForm key={rate.id} rate={rate} onCancel={() => setEditingRateId(null)} />
                        ) : (
                            <div key={rate.id} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-medium text-zinc-800">{rate.nombre}</h3>
                                        <p className="text-sm text-zinc-500 mt-0.5">{tipoLabel[rate.tipo]} · {fmt(rate.precio)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${rate.activa ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'}`}>
                                            {rate.activa ? 'Activa' : 'Inactiva'}
                                        </span>
                                        <button onClick={() => setEditingRateId(rate.id)} className="text-xs text-zinc-700 underline-offset-2 hover:underline font-medium">Editar</button>
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                    {rates.length === 0 && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400">Sin tarifas creadas. Crea la primera →</div>
                    )}
                </div>
                <div>
                    <NewRateForm />
                </div>
            </div>
        </TenantLayout>
    );
}
