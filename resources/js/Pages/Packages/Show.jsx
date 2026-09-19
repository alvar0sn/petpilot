import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, formatDateTime, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const tipoLabel = { consumo: 'Consumo', ajuste: 'Ajuste', vencimiento: 'Vencimiento' };
const pagoTipoLabel = { inicial: 'Anticipo', abono: 'Abono' };

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

function AbonoForm({ pkg, onDone }) {
    const form = useForm({ monto: pkg.saldo_pendiente ? String(pkg.saldo_pendiente) : '', notas: '' });

    function submit(e) {
        e.preventDefault();
        form.post(route('packages.payments.store', pkg.id), { onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50">
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Monto del abono *</label>
                <input type="number" step="0.01" min="0.01" max={pkg.saldo_pendiente || undefined}
                    className="w-full border-gray-300 rounded-lg text-sm font-mono"
                    value={form.data.monto} onChange={e => form.setData('monto', e.target.value)} />
                {form.errors.monto && <p className="text-rose-500 text-xs mt-0.5">{form.errors.monto}</p>}
            </div>
            <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Notas (opcional)</label>
                <input className="w-full border-gray-300 rounded-lg text-sm" value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
            </div>
            <button type="submit" disabled={form.processing}
                className="w-full bg-zinc-900 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                Registrar abono
            </button>
        </form>
    );
}

export default function PackagesShow({ package: pkg }) {
    const tz = useTenantTimezone();
    const [showAbono, setShowAbono] = useState(false);

    const estadoPago = pkg.pagado ? 'pagado' : pkg.monto_pagado > 0 ? 'adeudo' : 'sin_pagar';

    return (
        <TenantLayout title={`Paquete de ${pkg.pet?.nombre ?? ''}`}>
            <div className="mb-4">
                <Link href={route('packages.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Paquetes</Link>
            </div>

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            {pkg.pet?.nombre} <span className="text-sm font-normal text-zinc-400">#{pkg.id}</span>
                        </h2>
                        <p className="text-sm text-zinc-500">{pkg.owner?.nombre} · {pkg.owner?.telefono}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            estadoPago === 'sin_pagar' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            : estadoPago === 'adeudo' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                            : pkg.vencido ? 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        }`}>
                            {estadoPago === 'sin_pagar' ? (pkg.ticket_estado === 'cancelado' ? 'Cancelado' : 'Pendiente de pago')
                                : estadoPago === 'adeudo' ? `Adeudo: ${fmt(pkg.saldo_pendiente)}`
                                : pkg.vencido ? 'Vencido' : 'Vigente'}
                        </span>
                        {pkg.tiene_adeudo && (
                            <button onClick={() => setShowAbono(v => !v)} className="text-xs text-zinc-700 underline-offset-2 hover:underline">
                                {showAbono ? 'Cancelar' : 'Registrar abono'}
                            </button>
                        )}
                    </div>
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
                        {pkg.tiene_adeudo && <p className="text-xs text-orange-600">Pagado: {fmt(pkg.monto_pagado)}</p>}
                    </div>
                    {pkg.ticket_id && (
                        <div>
                            <p className="text-xs text-zinc-400">Ticket inicial</p>
                            <Link href={route('pos.index', { ticket: pkg.ticket_id })} className="font-medium text-zinc-700 hover:underline">
                                #{pkg.ticket_folio}
                            </Link>
                            <span className="text-xs text-zinc-400 ml-1 capitalize">({pkg.ticket_estado})</span>
                        </div>
                    )}
                </div>

                {showAbono && (
                    <div className="mt-4 max-w-sm">
                        <AbonoForm pkg={pkg} onDone={() => setShowAbono(false)} />
                    </div>
                )}

                {pkg.payments?.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Historial de pagos</p>
                        <div className="space-y-1 text-xs text-zinc-600">
                            {pkg.payments.map(p => (
                                <div key={p.id} className="flex justify-between">
                                    <span>
                                        {pagoTipoLabel[p.tipo] ?? p.tipo}
                                        {p.ticket_id && (
                                            <> — <Link href={route('pos.index', { ticket: p.ticket_id })} className="hover:underline">#{p.ticket_folio}</Link> <span className="capitalize">({p.ticket_estado})</span></>
                                        )}
                                        {p.notas ? ` — ${p.notas}` : ''}
                                    </span>
                                    <span className="whitespace-nowrap ml-2">{fmt(p.monto)} · {formatDateTime(p.created_at, tz)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
