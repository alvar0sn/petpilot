import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
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
    const [importOpen, setImportOpen] = useState(false);
    const fileRef = useRef();
    const importForm = useForm({ archivo: null });
    const { props } = usePage();
    const importErrors = props.flash?.import_errors ?? [];

    function doSearch(e) {
        e.preventDefault();
        router.get(route('owners.index'), { search }, { preserveState: true });
    }

    function handleFile(e) {
        importForm.setData('archivo', e.target.files[0] ?? null);
    }

    function submitImport(e) {
        e.preventDefault();
        if (!importForm.data.archivo) return;
        importForm.post(route('owners.import'), {
            forceFormData: true,
            onSuccess: () => { setImportOpen(false); importForm.reset(); if (fileRef.current) fileRef.current.value = ''; },
        });
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
                <div className="flex gap-2">
                    <button onClick={() => setImportOpen(o => !o)}
                        className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                        Importar CSV
                    </button>
                    <Link href={route('owners.create')}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors text-center">
                        + Nuevo cliente
                    </Link>
                </div>
            </div>

            {/* Panel de importación */}
            {importOpen && (
                <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-zinc-800 text-sm">Importación masiva de clientes</h2>
                        <button onClick={() => setImportOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">✕</button>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4 text-sm text-zinc-600 space-y-1">
                        <p className="font-medium text-zinc-700">Columnas requeridas en el CSV:</p>
                        <p><span className="font-mono text-xs bg-zinc-100 px-1 rounded">nombre</span>, <span className="font-mono text-xs bg-zinc-100 px-1 rounded">apellidos</span>, <span className="font-mono text-xs bg-zinc-100 px-1 rounded">telefono</span>, <span className="font-mono text-xs bg-zinc-100 px-1 rounded">email</span>, <span className="font-mono text-xs bg-zinc-100 px-1 rounded">direccion</span>, <span className="font-mono text-xs bg-zinc-100 px-1 rounded">notas</span></p>
                        <p className="text-xs text-zinc-400">Solo <strong>nombre</strong> y <strong>telefono</strong> son obligatorios. Los teléfonos duplicados se omiten automáticamente.</p>
                    </div>

                    <a href={route('owners.import.template')}
                        className="inline-flex items-center gap-2 text-sm text-zinc-700 border border-zinc-200 bg-white px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors font-medium">
                        ↓ Descargar plantilla CSV
                    </a>

                    <form onSubmit={submitImport} className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Archivo CSV (máx. 5 MB)</label>
                            <input ref={fileRef} type="file" accept=".csv,text/csv"
                                onChange={handleFile}
                                className="block w-full text-sm text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer" />
                        </div>
                        <button type="submit" disabled={!importForm.data.archivo || importForm.processing}
                            className="bg-zinc-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">
                            {importForm.processing ? 'Importando…' : 'Subir e importar'}
                        </button>
                    </form>

                    {importErrors.length > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 space-y-1">
                            <p className="text-xs font-semibold text-rose-700">Filas con errores:</p>
                            {importErrors.map((err, i) => (
                                <p key={i} className="text-xs text-rose-600">{err}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}


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
