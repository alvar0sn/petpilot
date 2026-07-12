import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const estadoBadge = {
    pagado:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelado: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
    abierto:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

export default function PosHistory({ tickets, filters }) {
    const tz = useTenantTimezone();
    const [estado, setEstado] = useState(filters.estado ?? '');
    const [fecha, setFecha] = useState(filters.fecha ?? '');

    function doFilter() {
        router.get(route('pos.history'), { estado: estado || undefined, fecha: fecha || undefined }, { preserveState: true });
    }

    return (
        <TenantLayout title="Historial de tickets">
            <div className="flex gap-3 mb-4">
                <Link href={route('pos.index')} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">← Volver al POS</Link>
            </div>

            <div className="flex gap-3 mb-4 flex-wrap">
                <select className="border-gray-300 rounded-lg text-sm" value={estado} onChange={e => setEstado(e.target.value)}>
                    <option value="">Todos los estados</option>
                    <option value="pagado">Pagado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="abierto">Abierto</option>
                </select>
                <input type="date" className="border-gray-300 rounded-lg text-sm" value={fecha} onChange={e => setFecha(e.target.value)} />
                <button onClick={doFilter} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Filtrar</button>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-100 text-sm">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Folio</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cliente</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Estado</th>
                            <th className="px-5 py-3.5 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Fecha</th>
                            <th className="px-5 py-3.5 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide">Ticket</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {tickets.data.map(t => (
                            <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-5 py-3.5 font-mono font-medium text-zinc-800">#{t.folio}</td>
                                <td className="px-5 py-3.5 text-zinc-600">{t.owner}</td>
                                <td className="px-5 py-3.5">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoBadge[t.estado]}`}>{t.estado}</span>
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono">{fmt(t.total)}</td>
                                <td className="px-5 py-3.5 text-zinc-400 text-xs">
                                    {t.cobrado_at ? formatDate(t.cobrado_at, tz) : formatDate(t.created_at, tz)}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    {t.token && (
                                        <a href={`/t/${t.token}`} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-zinc-700 hover:underline underline-offset-2">
                                            Ver
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {tickets.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">Sin tickets.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {tickets.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-zinc-100 flex gap-2 justify-center text-sm">
                        {tickets.links.map((link, i) => (
                            <button key={i} onClick={() => link.url && router.get(link.url)} disabled={!link.url}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${link.active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'} disabled:opacity-40`}
                                dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </div>
                )}
            </div>
            <p className="text-xs text-zinc-400 mt-2">{tickets.total} tickets</p>
        </TenantLayout>
    );
}
