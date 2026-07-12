import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, usePage, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';

const syncBadge = {
    synced:  'bg-emerald-100 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-100 text-amber-700 ring-amber-200',
    failed:  'bg-red-100 text-red-700 ring-red-200',
};

const syncLabel = {
    synced:  'Sync',
    pending: 'Pendiente',
    failed:  'Error',
};

function SyncBadge({ status, contactId }) {
    if (!contactId && status !== 'synced') {
        return <span className="text-xs bg-gray-100 text-gray-500 ring-1 ring-gray-200 px-2 py-0.5 rounded-full">Sin GHL</span>;
    }
    const cls = syncBadge[status] ?? 'bg-gray-100 text-gray-500 ring-gray-200';
    return <span className={`text-xs ring-1 px-2 py-0.5 rounded-full ${cls}`}>{syncLabel[status] ?? status}</span>;
}

export default function SuperAdminOwners({ owners, tenants, filters }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search);
    const [tenantId, setTenantId] = useState(filters.tenant_id);
    const [syncStatus, setSyncStatus] = useState(filters.sync_status);
    const [selected, setSelected] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => applyFilters(), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { applyFilters(); }, [tenantId, syncStatus]);

    function applyFilters() {
        router.get(route('super-admin.owners.index'), {
            search:      search || undefined,
            tenant_id:   tenantId || undefined,
            sync_status: syncStatus || undefined,
        }, { preserveState: true, replace: true });
    }

    function toggleSelect(id) {
        setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    }

    function toggleAll() {
        const pageIds = owners.data.map(o => o.id);
        const allSelected = pageIds.every(id => selected.includes(id));
        setSelected(allSelected ? selected.filter(id => !pageIds.includes(id)) : [...new Set([...selected, ...pageIds])]);
    }

    function syncOne(ownerId) {
        router.post(route('super-admin.owners.sync', ownerId), {}, { preserveScroll: true });
    }

    function syncBulk() {
        if (!selected.length) return;
        setBulkLoading(true);
        router.post(route('super-admin.owners.sync-bulk'), { ids: selected }, {
            preserveScroll: true,
            onFinish: () => { setBulkLoading(false); setSelected([]); },
        });
    }

    const pageIds = owners.data.map(o => o.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.includes(id));

    return (
        <SuperAdminLayout title="Clientes">
            {flash?.success && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">{flash.success}</div>
            )}

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input type="search" placeholder="Buscar nombre, email, teléfono…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="border-gray-300 rounded-lg text-sm w-64" />

                <select value={tenantId} onChange={e => setTenantId(e.target.value)}
                    className="border-gray-300 rounded-lg text-sm">
                    <option value="">Todos los tenants</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>

                <select value={syncStatus} onChange={e => setSyncStatus(e.target.value)}
                    className="border-gray-300 rounded-lg text-sm">
                    <option value="">Cualquier estado GHL</option>
                    <option value="synced">Sincronizados</option>
                    <option value="pending">Pendientes</option>
                    <option value="failed">Con error</option>
                    <option value="no_sync">Sin GHL</option>
                </select>

                <span className="text-sm text-gray-400">{owners.total} cliente{owners.total !== 1 ? 's' : ''}</span>

                {selected.length > 0 && (
                    <button onClick={syncBulk} disabled={bulkLoading}
                        className="ml-auto bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                        {bulkLoading ? 'Sincronizando…' : `Sync ${selected.length} seleccionado${selected.length !== 1 ? 's' : ''}`}
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full text-sm divide-y divide-gray-100">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 w-8">
                                <input type="checkbox" className="rounded border-gray-300"
                                    checked={allPageSelected} onChange={toggleAll} />
                            </th>
                            <th className="px-4 py-3 text-left">Cliente</th>
                            <th className="px-4 py-3 text-left">Tenant</th>
                            <th className="px-4 py-3 text-left">GHL Contact ID</th>
                            <th className="px-4 py-3 text-left">Estado GHL</th>
                            <th className="px-4 py-3 text-left">Mascotas</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {owners.data.map(o => (
                            <tr key={o.id} className={`hover:bg-gray-50 ${selected.includes(o.id) ? 'bg-indigo-50' : ''}`}>
                                <td className="px-4 py-3">
                                    <input type="checkbox" className="rounded border-gray-300"
                                        checked={selected.includes(o.id)}
                                        onChange={() => toggleSelect(o.id)} />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{o.nombre} {o.apellidos}</div>
                                    <div className="text-xs text-gray-400">{o.email || o.telefono}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{o.tenant?.nombre ?? '—'}</td>
                                <td className="px-4 py-3">
                                    {o.ghl_contact_id
                                        ? <span className="font-mono text-xs text-gray-600">{o.ghl_contact_id}</span>
                                        : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <SyncBadge status={o.ghl_sync_status} contactId={o.ghl_contact_id} />
                                </td>
                                <td className="px-4 py-3">
                                    {o.pets.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {o.pets.map((p, i) => (
                                                <span key={i} className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">
                                                    {p.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => syncOne(o.id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
                                        Sync GHL
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {owners.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No se encontraron clientes.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {owners.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                        <span>Página {owners.current_page} de {owners.last_page}</span>
                        <div className="flex gap-2">
                            {owners.prev_page_url && (
                                <Link href={owners.prev_page_url} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs">
                                    ← Anterior
                                </Link>
                            )}
                            {owners.next_page_url && (
                                <Link href={owners.next_page_url} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs">
                                    Siguiente →
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}
