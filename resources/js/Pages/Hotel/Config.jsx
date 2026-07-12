import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const tipoLabel = { guarderia: 'Guardería', hotel: 'Hotel' };
const tipoColor = { guarderia: 'bg-blue-100 text-blue-700', hotel: 'bg-purple-100 text-purple-700' };
const unidadLabel = { horas: 'hora(s)', dias: 'día(s)' };

function NewSpaceForm() {
    const { data, setData, post, processing, errors, reset } = useForm({ nombre: '', capacidad: '' });

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-zinc-700">Nuevo espacio</h3>
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} placeholder="Ej: Jaula 3, Suite A..." />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Capacidad (mascotas)</label>
                <input type="number" min="1" step="1" className="w-full border-gray-300 rounded-lg text-sm" value={data.capacidad} onChange={e => setData('capacidad', e.target.value)} placeholder="Ej: 2" />
                {errors.capacidad && <p className="text-red-500 text-xs mt-1">{errors.capacidad}</p>}
            </div>
            <button onClick={() => post(route('hotel.spaces.store'), { onSuccess: reset })}
                disabled={processing}
                className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {processing ? 'Guardando...' : 'Crear espacio'}
            </button>
        </div>
    );
}

function EditSpaceForm({ space, onCancel }) {
    const { data, setData, put, processing, errors } = useForm({ nombre: space.nombre, capacidad: space.capacidad ?? '', activo: space.activo });

    return (
        <div className="bg-white border-2 border-zinc-200 shadow-sm rounded-xl p-4 space-y-3">
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Capacidad (mascotas)</label>
                <input type="number" min="1" step="1" className="w-full border-gray-300 rounded-lg text-sm" value={data.capacidad} onChange={e => setData('capacidad', e.target.value)} placeholder="Ej: 2" />
                {errors.capacidad && <p className="text-red-500 text-xs mt-1">{errors.capacidad}</p>}
            </div>
            <label className="flex items-center gap-2">
                <input type="checkbox" checked={data.activo} onChange={e => setData('activo', e.target.checked)} className="rounded text-zinc-900" />
                <span className="text-sm text-zinc-700">Espacio activo</span>
            </label>
            <div className="flex gap-2">
                <button onClick={() => put(route('hotel.spaces.update', space.id), { onSuccess: onCancel })} disabled={processing}
                    className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                    Guardar
                </button>
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">Cancelar</button>
            </div>
        </div>
    );
}

function NewRateForm() {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: '', tipo: 'hotel', unidad: 'dias', cantidad: 1, precio: '',
    });

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-zinc-700">Nueva tarifa</h3>
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre *</label>
                <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} placeholder="Ej: Noche estándar" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.tipo} onChange={e => setData('tipo', e.target.value)}>
                        <option value="hotel">Hotel</option>
                        <option value="guarderia">Guardería</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Unidad *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.unidad} onChange={e => setData('unidad', e.target.value)}>
                        <option value="dias">Días</option>
                        <option value="horas">Horas</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Cantidad *</label>
                    <input type="number" step="0.01" min="0.01" className="w-full border-gray-300 rounded-lg text-sm" value={data.cantidad} onChange={e => setData('cantidad', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Precio *</label>
                    <input type="number" step="0.01" min="0" className="w-full border-gray-300 rounded-lg text-sm" value={data.precio} onChange={e => setData('precio', e.target.value)} />
                </div>
            </div>
            <p className="text-xs text-zinc-400">Se creará automáticamente un artículo en el catálogo de POS para cobrar esta tarifa.</p>
            <button onClick={() => post(route('hotel.rates.store'), { onSuccess: reset })}
                disabled={processing}
                className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {processing ? 'Guardando...' : 'Crear tarifa'}
            </button>
        </div>
    );
}

function EditRateForm({ rate, onCancel }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: rate.nombre, tipo: rate.tipo, unidad: rate.unidad, cantidad: rate.cantidad, precio: rate.precio, activa: rate.activa,
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
                        <option value="hotel">Hotel</option>
                        <option value="guarderia">Guardería</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Unidad *</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.unidad} onChange={e => setData('unidad', e.target.value)}>
                        <option value="dias">Días</option>
                        <option value="horas">Horas</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Cantidad *</label>
                    <input type="number" step="0.01" min="0.01" className="w-full border-gray-300 rounded-lg text-sm" value={data.cantidad} onChange={e => setData('cantidad', e.target.value)} />
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
                <button onClick={() => put(route('hotel.rates.update', rate.id), { onSuccess: onCancel })} disabled={processing}
                    className="flex-1 bg-zinc-900 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                    Guardar
                </button>
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">Cancelar</button>
            </div>
        </div>
    );
}

export default function HotelConfig({ spaces, rates }) {
    const [editingSpaceId, setEditingSpaceId] = useState(null);
    const [editingRateId, setEditingRateId] = useState(null);

    return (
        <TenantLayout title="Hotel / Guardería — Espacios y tarifas">
            <div className="mb-4">
                <Link href={route('hotel.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Hotel / Guardería</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="font-semibold text-zinc-800">Espacios</h2>
                    {spaces.map(space => (
                        editingSpaceId === space.id ? (
                            <EditSpaceForm key={space.id} space={space} onCancel={() => setEditingSpaceId(null)} />
                        ) : (
                            <div key={space.id} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <span className="font-medium text-zinc-800">{space.nombre}</span>
                                    {space.capacidad && <p className="text-xs text-zinc-400">Capacidad: {space.capacidad} mascota{space.capacidad > 1 ? 's' : ''}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${space.activo ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'}`}>
                                        {space.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <button onClick={() => setEditingSpaceId(space.id)} className="text-xs text-zinc-700 underline-offset-2 hover:underline font-medium">Editar</button>
                                </div>
                            </div>
                        )
                    ))}
                    {spaces.length === 0 && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400">Sin espacios creados. Crea el primero →</div>
                    )}
                </div>
                <div>
                    <NewSpaceForm />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="font-semibold text-zinc-800">Tarifas</h2>
                    {rates.map(rate => (
                        editingRateId === rate.id ? (
                            <EditRateForm key={rate.id} rate={rate} onCancel={() => setEditingRateId(null)} />
                        ) : (
                            <div key={rate.id} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-zinc-800">{rate.nombre}</h3>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tipoColor[rate.tipo]}`}>{tipoLabel[rate.tipo]}</span>
                                        </div>
                                        <p className="text-sm text-zinc-500 mt-0.5">{fmt(rate.precio)} / {rate.cantidad} {unidadLabel[rate.unidad]}</p>
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
