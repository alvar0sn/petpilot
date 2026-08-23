import TenantLayout from '@/Layouts/TenantLayout';
import { Link } from '@inertiajs/react';
import { formatDateTime, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function ShiftMercadoPago({ shift, tickets, total }) {
    const tz = useTenantTimezone();

    return (
        <TenantLayout title="Transacciones de Mercado Pago">
            <div className="flex items-center gap-3 mb-4">
                <Link href={route('pos.shift.show', shift.id)} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                    ← Turno
                </Link>
                <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Transacciones de Mercado Pago</h1>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{tickets.length} transacción{tickets.length !== 1 ? 'es' : ''}</span>
                    <span className="font-mono font-semibold text-zinc-800">{fmt(total)}</span>
                </div>

                {tickets.length === 0 ? (
                    <p className="px-5 py-10 text-center text-zinc-400 text-sm">Sin transacciones de Mercado Pago en este turno.</p>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-xs text-zinc-400 uppercase tracking-wide bg-zinc-50">
                                <th className="text-left px-5 py-2.5">Ticket</th>
                                <th className="text-left px-5 py-2.5">Cliente</th>
                                <th className="text-left px-5 py-2.5">Fecha</th>
                                <th className="text-left px-5 py-2.5">ID de pago (MP)</th>
                                <th className="text-right px-5 py-2.5">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td className="px-5 py-2.5 font-mono">
                                        {t.token ? (
                                            <a href={`/t/${t.token}`} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">
                                                #{t.folio}
                                            </a>
                                        ) : `#${t.folio}`}
                                    </td>
                                    <td className="px-5 py-2.5 text-zinc-700">{t.cliente}</td>
                                    <td className="px-5 py-2.5 text-zinc-500">{t.cobrado_at ? formatDateTime(t.cobrado_at, tz) : '—'}</td>
                                    <td className="px-5 py-2.5 font-mono text-zinc-600">{t.mp_payment_id ?? '—'}</td>
                                    <td className="px-5 py-2.5 text-right font-mono">{fmt(t.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </TenantLayout>
    );
}
