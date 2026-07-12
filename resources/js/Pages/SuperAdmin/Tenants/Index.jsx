import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const estadoBadge = {
    activo: 'bg-green-100 text-green-800',
    inactivo: 'bg-red-100 text-red-800',
    trial: 'bg-yellow-100 text-yellow-800',
};

export default function TenantsIndex({ tenants, filters }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters?.search ?? '');

    useEffect(() => {
        const t = setTimeout(() => {
            router.get(route('super-admin.index'), { search: search || undefined }, { preserveState: true, replace: true });
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    function toggle(tenant) {
        router.patch(route('super-admin.tenants.toggle', tenant.id));
    }

    function impersonate(tenant) {
        router.post(route('super-admin.impersonate.start', tenant.id));
    }

    return (
        <SuperAdminLayout title="Tenants">
            {flash?.success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                    {flash.success}
                </div>
            )}

            <div className="mb-4 flex items-center gap-3">
                <input
                    type="search"
                    placeholder="Buscar por nombre o slug…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border-gray-300 rounded-lg text-sm w-64"
                />
                <span className="text-sm text-gray-400">{tenants.length} resultado{tenants.length !== 1 ? 's' : ''}</span>
                <div className="ml-auto">
                    <Link href={route('super-admin.tenants.create')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                        + Nuevo Tenant
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 text-left">Negocio</th>
                            <th className="px-4 py-3 text-left">Slug</th>
                            <th className="px-4 py-3 text-left">Estado</th>
                            <th className="px-4 py-3 text-right">Owners</th>
                            <th className="px-4 py-3 text-right">Mascotas</th>
                            <th className="px-4 py-3 text-right">Tickets mes</th>
                            <th className="px-4 py-3 text-right">Estancias</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tenants.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    <Link href={route('super-admin.tenants.show', t.id)} className="hover:text-indigo-600">
                                        {t.nombre}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-gray-500 font-mono">{t.slug}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoBadge[t.estado]}`}>
                                        {t.estado}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700">{t.owners_count}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{t.pets_count}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{t.tickets_mes}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{t.estancias_activas}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <Link
                                            href={route('super-admin.tenants.show', t.id)}
                                            className="text-indigo-600 hover:underline text-xs"
                                        >
                                            Ver
                                        </Link>
                                        <button
                                            onClick={() => impersonate(t)}
                                            className="text-amber-600 hover:underline text-xs"
                                        >
                                            Acceder
                                        </button>
                                        <button
                                            onClick={() => toggle(t)}
                                            className="text-gray-500 hover:underline text-xs"
                                        >
                                            {t.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tenants.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                    No hay tenants aún.{' '}
                                    <Link href={route('super-admin.tenants.create')} className="text-indigo-600 hover:underline">
                                        Crear el primero
                                    </Link>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </SuperAdminLayout>
    );
}
