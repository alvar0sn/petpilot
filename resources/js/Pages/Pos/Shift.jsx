import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { formatDateTime, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const estadoBadge = {
    abierto: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cerrado: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
};

export default function PosShift({ shifts, hayTurnoAbierto }) {
    const tz = useTenantTimezone();
    const openForm = useForm({ fondo_inicial: '' });

    return (
        <TenantLayout title="Turnos">
            {!hayTurnoAbierto && (
                <div className="max-w-sm mb-6 bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 tracking-tight mb-4">Abrir turno</h2>
                    <form onSubmit={e => { e.preventDefault(); openForm.post(route('pos.shift.store')); }}>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Fondo inicial (efectivo en caja)</label>
                        <input
                            type="number" step="0.01"
                            className="w-full border-gray-300 rounded-lg text-sm mb-4"
                            value={openForm.data.fondo_inicial}
                            onChange={e => openForm.setData('fondo_inicial', e.target.value)}
                            placeholder="0.00"
                        />
                        <button type="submit" disabled={openForm.processing}
                            className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            Abrir turno
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-100 text-sm">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Apertura</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Abierto por</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cierre</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Cerrado por</th>
                            <th className="px-5 py-3.5 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">Monto inicial</th>
                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">Estado</th>
                            <th className="px-5 py-3.5 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {shifts.data.map(s => (
                            <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-5 py-3.5 text-zinc-700">{formatDateTime(s.fecha_apertura, tz)}</td>
                                <td className="px-5 py-3.5 text-zinc-600">{s.abierto_por}</td>
                                <td className="px-5 py-3.5 text-zinc-700">{s.fecha_cierre ? formatDateTime(s.fecha_cierre, tz) : '—'}</td>
                                <td className="px-5 py-3.5 text-zinc-600">{s.cerrado_por ?? '—'}</td>
                                <td className="px-5 py-3.5 text-right font-mono">{fmt(s.fondo_inicial)}</td>
                                <td className="px-5 py-3.5">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoBadge[s.estado]}`}>{s.estado}</span>
                                </td>
                                <td className="px-5 py-3.5 text-center space-x-3">
                                    {s.estado === 'abierto' && (
                                        <Link href={route('pos.shift.show', s.id)} className="text-xs text-red-600 hover:underline underline-offset-2">
                                            Cerrar
                                        </Link>
                                    )}
                                    <Link href={route('pos.shift.show', s.id)} className="text-xs text-zinc-700 hover:underline underline-offset-2">
                                        Ver
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {shifts.data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-zinc-400">Sin turnos registrados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {shifts.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-zinc-100 flex gap-2 justify-center text-sm">
                        {shifts.links.map((link, i) => (
                            <button key={i} onClick={() => link.url && router.get(link.url)} disabled={!link.url}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${link.active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'} disabled:opacity-40`}
                                dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </div>
                )}
            </div>
        </TenantLayout>
    );
}
