import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const servicioLabel = { guarderia: 'Guardería', hotel: 'Hotel', estetica: 'Estética', paseo: 'Paseo' };
const servicioColor = { guarderia: 'bg-blue-100 text-blue-700', hotel: 'bg-purple-100 text-purple-700', estetica: 'bg-pink-100 text-pink-700', paseo: 'bg-green-100 text-green-700' };
const SERVICES = ['guarderia', 'hotel', 'estetica', 'paseo'];

function NewPlanForm() {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: '',
        precio: '',
        vigencia_dias: 30,
        reinicio_creditos: 'ninguno',
        credits: [],
    });

    function toggleService(tipo) {
        const exists = data.credits.find(c => c.servicio_tipo === tipo);
        if (exists) {
            setData('credits', data.credits.filter(c => c.servicio_tipo !== tipo));
        } else {
            setData('credits', [...data.credits, { servicio_tipo: tipo, creditos: 1 }]);
        }
    }

    function setCreditos(tipo, val) {
        setData('credits', data.credits.map(c => c.servicio_tipo === tipo ? { ...c, creditos: parseInt(val) || 1 } : c));
    }

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-zinc-700">Nuevo plan</h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre del plan *</label>
                    <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} placeholder="Ej: Todo Incluido" />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Precio *</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm" value={data.precio} onChange={e => setData('precio', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Vigencia (días) *</label>
                    <input type="number" className="w-full border-gray-300 rounded-lg text-sm" value={data.vigencia_dias} onChange={e => setData('vigencia_dias', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Reinicio de créditos</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.reinicio_creditos} onChange={e => setData('reinicio_creditos', e.target.value)}>
                        <option value="ninguno">No se reinician (duran toda la vigencia)</option>
                        <option value="semanal">Cada semana</option>
                        <option value="mensual">Cada mes</option>
                    </select>
                </div>
            </div>

            <div>
                <p className="text-xs font-medium text-zinc-600 mb-2">Créditos por servicio</p>
                <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map(tipo => {
                        const credit = data.credits.find(c => c.servicio_tipo === tipo);
                        return (
                            <div key={tipo} className={`border rounded-lg p-2 ${credit ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200'}`}>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!credit} onChange={() => toggleService(tipo)} className="rounded text-zinc-900" />
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${servicioColor[tipo]}`}>{servicioLabel[tipo]}</span>
                                </label>
                                {credit && (
                                    <div className="mt-1.5 flex items-center gap-1">
                                        <span className="text-xs text-zinc-500">Créditos:</span>
                                        <input type="number" min="1" className="w-16 border-gray-300 rounded text-xs text-center" value={credit.creditos} onChange={e => setCreditos(tipo, e.target.value)} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {errors.credits && <p className="text-red-500 text-xs mt-1">{errors.credits}</p>}
            </div>

            <button onClick={() => post(route('memberships.plans.store'), { onSuccess: reset })}
                disabled={processing}
                className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {processing ? 'Guardando...' : 'Crear plan'}
            </button>
        </div>
    );
}

function EditPlanForm({ plan, onCancel }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: plan.nombre,
        precio: plan.precio,
        vigencia_dias: plan.vigencia_dias,
        reinicio_creditos: plan.reinicio_creditos,
        activo: plan.activo,
    });

    function submit() {
        put(route('memberships.plans.update', plan.id), { onSuccess: onCancel });
    }

    return (
        <div className="bg-white border-2 border-zinc-200 shadow-sm rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-zinc-700">Editar plan</h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre del plan *</label>
                    <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Precio *</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm" value={data.precio} onChange={e => setData('precio', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Vigencia (días) *</label>
                    <input type="number" className="w-full border-gray-300 rounded-lg text-sm" value={data.vigencia_dias} onChange={e => setData('vigencia_dias', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Reinicio de créditos</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={data.reinicio_creditos} onChange={e => setData('reinicio_creditos', e.target.value)}>
                        <option value="ninguno">No se reinician (duran toda la vigencia)</option>
                        <option value="semanal">Cada semana</option>
                        <option value="mensual">Cada mes</option>
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={data.activo} onChange={e => setData('activo', e.target.checked)} className="rounded text-zinc-900" />
                        <span className="text-sm text-zinc-700">Plan activo</span>
                    </label>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={submit} disabled={processing}
                    className="flex-1 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
                    {processing ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors">
                    Cancelar
                </button>
            </div>
        </div>
    );
}

export default function MembershipsPlans({ plans }) {
    const [editingId, setEditingId] = useState(null);

    return (
        <TenantLayout title="Planes de membresía">
            <div className="mb-4">
                <Link href={route('memberships.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Membresías activas</Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Lista de planes existentes */}
                <div className="lg:col-span-2 space-y-3">
                    {plans.map(plan => (
                        editingId === plan.id ? (
                            <EditPlanForm key={plan.id} plan={plan} onCancel={() => setEditingId(null)} />
                        ) : (
                            <div key={plan.id} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-zinc-800">{plan.nombre}</h3>
                                        <p className="text-sm text-zinc-500 mt-0.5">
                                            {fmt(plan.precio)} · {plan.vigencia_dias} días
                                            {plan.reinicio_creditos !== 'ninguno' && (
                                                <> · créditos se reinician {plan.reinicio_creditos === 'semanal' ? 'cada semana' : 'cada mes'}</>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${plan.activo ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'}`}>
                                            {plan.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <button onClick={() => setEditingId(plan.id)} className="text-xs text-zinc-700 underline-offset-2 hover:underline font-medium">
                                            Editar
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {plan.plan_credits?.map(c => (
                                        <span key={c.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${servicioColor[c.servicio_tipo]}`}>
                                            {c.creditos} {servicioLabel[c.servicio_tipo]}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                    {plans.length === 0 && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400">
                            Sin planes creados. Crea el primero →
                        </div>
                    )}
                </div>

                {/* Formulario nuevo plan */}
                <div>
                    <NewPlanForm />
                </div>
            </div>
        </TenantLayout>
    );
}
