import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const syncBadge = {
    synced: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    failed: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
};

const syncLabel = {
    synced: 'Sincronizado',
    pending: 'Pendiente',
    failed: 'Error',
};

export default function OwnersIndex({ owners, filters }) {
    const tz = useTenantTimezone();
    const [search, setSearch] = useState(filters.search ?? '');

    function doSearch(e) {
        e.preventDefault();
        router.get(route('owners.index'), { search }, { preserveState: true });
    }

    return (
        <TenantLayout title="Clientes">
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <form onSubmit={doSearch} className="flex gap-2 flex-1">
                    <input
                        className="flex-1 border-gray-300 rounded-lg text-sm"
                        placeholder="Buscar por nombre, teléfono, mascota..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Buscar</button>
                </form>
                <Link href={route('owners.create')}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors text-center">
                    + Nuevo cliente
                </Link>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-3 text-left">Cliente</th>
                            <th className="px-4 py-3 text-left">Teléfono</th>
                            <th className="px-4 py-3 text-left">Mascotas</th>
                            <th className="px-4 py-3 text-left">Sincronización</th>
                            <th className="px-4 py-3 text-left">Registro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {owners.data.map(o => (
                            <tr key={o.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-3">
                                    <Link href={route('owners.show', o.id)} className="font-medium text-zinc-900 hover:underline">
                                        {o.nombre_completo}
                                    </Link>
                                    {o.email && <div className="text-xs text-zinc-400">{o.email}</div>}
                                </td>
                                <td className="px-4 py-3 text-zinc-600 font-mono">{o.telefono}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {o.pets.map((p, i) => (
                                            <Link key={i} href={route('pets.show', p.id)}
                                                className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-xs hover:bg-zinc-200 transition-colors">
                                                {p.nombre}
                                            </Link>
                                        ))}
                                        {o.pets_count > 3 && (
                                            <span className="text-xs text-zinc-400">+{o.pets_count - 3}</span>
                                        )}
                                        {o.pets_count === 0 && <span className="text-xs text-zinc-400">Sin mascotas</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${syncBadge[o.ghl_sync_status]}`}>
                                        {syncLabel[o.ghl_sync_status] ?? o.ghl_sync_status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs">
                                    {formatDate(o.created_at, tz)}
                                </td>
                            </tr>
                        ))}
                        {owners.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                                    No se encontraron clientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {owners.last_page > 1 && (
                    <div className="px-4 py-3 border-t flex gap-2 justify-center text-sm">
                        {owners.links.map((link, i) => (
                            <button key={i}
                                onClick={() => link.url && router.get(link.url)}
                                disabled={!link.url}
                                className={`px-3 py-1 rounded ${link.active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'} disabled:opacity-40`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-zinc-400 mt-3">{owners.total} clientes en total</p>
        </TenantLayout>
    );
}
