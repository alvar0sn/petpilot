import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function PackagesIndex({ packages, filters }) {
    const tz = useTenantTimezone();
    const [search, setSearch] = useState(filters.search ?? '');

    function doSearch(e) {
        e.preventDefault();
        router.get(route('packages.index'), { search }, { preserveState: true, replace: true });
    }

    return (
        <TenantLayout title="Paquetes">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-zinc-800">Paquetes</h2>
                <Link href={route('packages.create')} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                    + Nuevo paquete
                </Link>
            </div>

            <form onSubmit={doSearch} className="flex gap-2 mb-4">
                <input className="flex-1 border-gray-300 rounded-lg text-sm"
                    placeholder="Buscar por mascota o dueño..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Buscar</button>
            </form>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-3 text-left">Mascota / Dueño</th>
                            <th className="px-4 py-3 text-left">Pago</th>
                            <th className="px-4 py-3 text-left">Créditos restantes</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-left">Vence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {packages.data.map(p => (
                            <tr key={p.id} onClick={() => router.visit(route('packages.show', p.id))} className="hover:bg-zinc-50 cursor-pointer">
                                <td className="px-4 py-3">
                                    <Link href={route('packages.show', p.id)} onClick={e => e.stopPropagation()} className="font-medium text-zinc-900 hover:text-zinc-700 hover:underline">
                                        {p.pet}
                                    </Link>
                                    {p.pagado && p.vencido && (
                                        <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">Vencido</span>
                                    )}
                                    <div className="text-xs text-zinc-400">{p.owner}</div>
                                </td>
                                <td className="px-4 py-3">
                                    {p.pagado ? (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Pagado</span>
                                    ) : (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                            {p.ticket_estado === 'cancelado' ? 'Cancelado' : 'Pendiente de pago'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-zinc-600">{p.creditos_restantes}/{p.creditos_totales}</td>
                                <td className="px-4 py-3 text-right font-mono">{fmt(p.total)}</td>
                                <td className="px-4 py-3">
                                    <span className={!p.vencido && p.creditos_restantes > 0 ? 'text-zinc-600' : 'text-zinc-400'}>
                                        {formatDate(p.fecha_vencimiento, tz, { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {packages.data.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-400">Sin paquetes registrados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </TenantLayout>
    );
}
