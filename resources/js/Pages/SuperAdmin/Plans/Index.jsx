import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function formatPrecio(precio, moneda) {
    const n = Number(precio);
    if (!n) return 'Gratis';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN' }).format(n);
}

function PlanForm({ plan, onDone }) {
    const isEdit = !!plan;
    const form = useForm({
        nombre: plan?.nombre ?? '',
        precio: plan?.precio ?? '0',
        moneda: plan?.moneda ?? 'MXN',
        descripcion: plan?.descripcion ?? '',
        activo: plan ? !!plan.activo : true,
        orden: plan?.orden ?? 0,
    });

    function submit(e) {
        e.preventDefault();
        if (isEdit) {
            form.put(route('super-admin.plans.update', plan.id), { onSuccess: onDone });
        } else {
            form.post(route('super-admin.plans.store'), { onSuccess: () => { form.reset(); onDone?.(); } });
        }
    }

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del plan *</label>
                    <input className="w-full border-gray-300 rounded-lg text-sm"
                        placeholder="Ej: Free, Demo, Pro"
                        value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} />
                    {form.errors.nombre && <p className="text-red-500 text-xs mt-0.5">{form.errors.nombre}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Precio *</label>
                        <input type="number" step="0.01" min="0" className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.precio} onChange={e => form.setData('precio', e.target.value)} />
                        {form.errors.precio && <p className="text-red-500 text-xs mt-0.5">{form.errors.precio}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.moneda} onChange={e => form.setData('moneda', e.target.value.toUpperCase())} />
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <input className="w-full border-gray-300 rounded-lg text-sm"
                    placeholder="Ej: hasta 2 sucursales, soporte por WhatsApp"
                    value={form.data.descripcion} onChange={e => form.setData('descripcion', e.target.value)} />
            </div>
            <div className="flex items-center gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                    <input type="number" min="0" className="w-24 border-gray-300 rounded-lg text-sm"
                        value={form.data.orden} onChange={e => form.setData('orden', e.target.value)} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input type="checkbox" className="rounded border-gray-300"
                        checked={form.data.activo} onChange={e => form.setData('activo', e.target.checked)} />
                    <span className="text-sm text-gray-600">Disponible para asignar</span>
                </label>
            </div>
            <div className="flex gap-2 pt-1">
                {isEdit && (
                    <button type="button" onClick={onDone}
                        className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                )}
                <button type="submit" disabled={form.processing}
                    className="flex-1 bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                    {form.processing ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
                </button>
            </div>
        </form>
    );
}

export default function PlansIndex({ plans }) {
    const { flash } = usePage().props;
    const [editPlan, setEditPlan] = useState(null);

    function destroy(plan) {
        if (confirm(`¿Eliminar el plan "${plan.nombre}"?`)) {
            router.delete(route('super-admin.plans.destroy', plan.id));
        }
    }

    return (
        <SuperAdminLayout title="Planes">
            {flash?.success && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
                    {flash.error}
                </div>
            )}

            <p className="text-sm text-gray-500 mb-6 max-w-2xl">
                Define aquí los planes disponibles (nombre y costo). Estos planes se asignan a cada tenant desde su ficha
                y se muestran en su sección de Configuración → Pagos para que sepan cuánto deben pagar.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Planes existentes</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {plans.map(plan => (
                            editPlan?.id === plan.id ? (
                                <div key={plan.id} className="px-5 py-4 bg-indigo-50/40">
                                    <PlanForm plan={plan} onDone={() => setEditPlan(null)} />
                                </div>
                            ) : (
                                <div key={plan.id} className="px-5 py-3.5 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900">{plan.nombre}</span>
                                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded-full px-2 py-0.5">
                                                {formatPrecio(plan.precio, plan.moneda)}
                                            </span>
                                            {!plan.activo && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ring-1 ring-gray-200">
                                                    no disponible
                                                </span>
                                            )}
                                        </div>
                                        {plan.descripcion && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{plan.descripcion}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-0.5">{plan.tenants_count} tenant(s) en este plan</p>
                                    </div>
                                    <div className="flex gap-3 shrink-0">
                                        <button onClick={() => setEditPlan(plan)}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                                            editar
                                        </button>
                                        <button onClick={() => destroy(plan)}
                                            className="text-xs text-red-500 hover:text-red-700 transition-colors">
                                            eliminar
                                        </button>
                                    </div>
                                </div>
                            )
                        ))}
                        {plans.length === 0 && (
                            <p className="px-5 py-4 text-sm text-gray-400">Aún no hay planes definidos.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 h-fit">
                    <h2 className="font-semibold text-gray-800 mb-4">Agregar plan</h2>
                    <PlanForm />
                </div>
            </div>
        </SuperAdminLayout>
    );
}
