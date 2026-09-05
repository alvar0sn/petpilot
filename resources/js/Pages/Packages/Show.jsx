import TenantLayout from '@/Layouts/TenantLayout';
import { Link } from '@inertiajs/react';
import { formatDate, formatDateTime, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const tipoLabel = { consumo: 'Consumo', ajuste: 'Ajuste', vencimiento: 'Vencimiento' };

function CreditCard({ credit, tz }) {
    const agotado = Number(credit.saldo_actual) <= 0;

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-zinc-800">{credit.nombre}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agotado ? 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                    {credit.saldo_actual}/{credit.saldo_inicial}
                </span>
            </div>
            {credit.movements.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                    {credit.movements.map(m => (
                        <div key={m.id} className="flex justify-between">
                            <span>{tipoLabel[m.tipo] ?? m.tipo}{m.notas ? ` — ${m.notas}` : ''}</span>
                            <span className="whitespace-nowrap ml-2">{formatDateTime(m.created_at, tz)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PackagesShow({ package: pkg }) {
    const tz = useTenantTimezone();

    return (
        <TenantLayout title={`Paquete de ${pkg.pet?.nombre ?? ''}`}>
            <div className="mb-4">
                <Link href={route('packages.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Paquetes</Link>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">{pkg.pet?.nombre}</h2>
                        <p className="text-sm text-zinc-500">{pkg.owner?.nombre} · {pkg.owner?.telefono}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.vencido ? 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                        {pkg.vencido ? 'Vencido' : 'Vigente'}
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                        <p className="text-xs text-zinc-400">Comprado</p>
                        <p className="font-medium">{formatDate(pkg.created_at, tz)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400">Vence</p>
                        <p className="font-medium">{formatDate(pkg.fecha_vencimiento, tz)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400">Total</p>
                        <p className="font-medium">{fmt(pkg.total)}</p>
                    </div>
                    {pkg.ticket_id && (
                        <div>
                            <p className="text-xs text-zinc-400">Ticket</p>
                            <Link href={route('pos.index', { ticket: pkg.ticket_id })} className="font-medium text-zinc-700 hover:underline">
                                #{pkg.ticket_folio}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-3">
                    <h3 className="font-semibold text-zinc-700 text-sm">Créditos disponibles</h3>
                    {pkg.credits.map(c => <CreditCard key={c.id} credit={c} tz={tz} />)}
                </div>

                <div className="space-y-3">
                    <h3 className="font-semibold text-zinc-700 text-sm">Artículos comprados</h3>
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                        <table className="min-w-full text-sm">
                            <tbody className="divide-y divide-zinc-100">
                                {pkg.items.map(i => (
                                    <tr key={i.id}>
                                        <td className="px-4 py-2.5 text-zinc-800">{i.nombre}</td>
                                        <td className="px-4 py-2.5 text-zinc-500 text-xs whitespace-nowrap">{i.cantidad}× {fmt(i.precio)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{fmt(i.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-zinc-50">
                                    <td colSpan={2} className="px-4 py-2.5 font-semibold text-zinc-700">Subtotal</td>
                                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(pkg.subtotal)}</td>
                                </tr>
                                {pkg.descuento_tipo && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-2.5 text-rose-600">
                                            Descuento {pkg.descuento_tipo === 'porcentaje' ? `(${pkg.descuento_valor}%)` : ''}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                                            − {fmt(pkg.subtotal - pkg.total)}
                                        </td>
                                    </tr>
                                )}
                                <tr>
                                    <td colSpan={2} className="px-4 py-2.5 font-semibold text-zinc-800">Total</td>
                                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(pkg.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </TenantLayout>
    );
}
