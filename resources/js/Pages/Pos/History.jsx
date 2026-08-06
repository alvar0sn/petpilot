import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const estadoBadge = {
    pagado:            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelado:         'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
    abierto:           'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    reembolsado:       'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
    reembolso_parcial: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
};

const estadoLabel = {
    pagado: 'pagado',
    cancelado: 'cancelado',
    abierto: 'abierto',
    reembolsado: 'reembolsado',
    reembolso_parcial: 'reembolso parcial',
};

function RefundModal({ ticket, paymentMethods, onClose }) {
    const form = useForm({
        monto: String(ticket.saldo_reembolsable.toFixed(2)),
        payment_method_id: paymentMethods[0]?.id ? String(paymentMethods[0].id) : '',
        motivo: '',
    });

    function submit(e) {
        e.preventDefault();
        form.post(route('pos.tickets.refund', ticket.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5">
                <h3 className="font-semibold text-zinc-800 mb-1">Reembolsar ticket #{ticket.folio}</h3>
                <p className="text-xs text-zinc-400 mb-4">Saldo reembolsable: {fmt(ticket.saldo_reembolsable)}</p>
                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Monto</label>
                        <input type="number" step="0.01" min="0.01" max={ticket.saldo_reembolsable}
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.monto} onChange={e => form.setData('monto', e.target.value)} />
                        {form.errors.monto && <p className="text-red-500 text-xs mt-1">{form.errors.monto}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Método de devolución</label>
                        <select className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.payment_method_id} onChange={e => form.setData('payment_method_id', e.target.value)}>
                            {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        {form.errors.payment_method_id && <p className="text-red-500 text-xs mt-1">{form.errors.payment_method_id}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Motivo</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.motivo} onChange={e => form.setData('motivo', e.target.value)} />
                        {form.errors.motivo && <p className="text-red-500 text-xs mt-1">{form.errors.motivo}</p>}
                    </div>
                    {form.errors.error && <p className="text-red-500 text-xs">{form.errors.error}</p>}
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={form.processing}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                            Reembolsar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function OwnerFilter({ ownerId, selectedOwner, onSelect }) {
    const { version } = usePage();
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);

    async function search(val) {
        setQ(val);
        if (val.length < 2) { setResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: val }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        setResults(r.data?.props?.owners?.data ?? []);
    }

    if (ownerId && selectedOwner) {
        return (
            <div className="flex items-center gap-1.5 border border-zinc-200 bg-white rounded-lg text-sm pl-3 pr-1.5 py-1.5">
                <span className="text-zinc-700">{selectedOwner.nombre_completo}</span>
                <button onClick={() => onSelect(null)} className="text-zinc-400 hover:text-red-500 text-xs px-1">✕</button>
            </div>
        );
    }

    return (
        <div className="relative">
            <input className="border-gray-300 rounded-lg text-sm w-56" placeholder="Buscar cliente..."
                value={q} onChange={e => search(e.target.value)} />
            {results.length > 0 && (
                <div className="absolute z-20 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {results.map(o => (
                        <button key={o.id} onClick={() => { onSelect(o); setQ(''); setResults([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">
                            <span className="font-medium">{o.nombre_completo}</span>
                            <span className="text-zinc-400 ml-2 font-mono">{o.telefono}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PosHistory({ tickets, filters, selectedOwner, paymentMethods }) {
    const tz = useTenantTimezone();
    const [estado, setEstado] = useState(filters.estado ?? '');
    const [fecha, setFecha] = useState(filters.fecha ?? '');
    const [ownerId, setOwnerId] = useState(filters.owner_id ?? '');
    const [refundTicket, setRefundTicket] = useState(null);

    function doFilter(overrides = {}) {
        const data = { estado, fecha, owner_id: ownerId, ...overrides };
        router.get(route('pos.history'), {
            estado: data.estado || undefined,
            fecha: data.fecha || undefined,
            owner_id: data.owner_id || undefined,
        }, { preserveState: true });
    }

    function selectOwner(owner) {
        setOwnerId(owner?.id ?? '');
        doFilter({ owner_id: owner?.id ?? '' });
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
                <OwnerFilter ownerId={ownerId} selectedOwner={selectedOwner} onSelect={selectOwner} />
                <button onClick={() => doFilter()} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Filtrar</button>
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
                            <th className="px-5 py-3.5 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {tickets.data.map(t => (
                            <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-5 py-3.5 font-mono font-medium text-zinc-800">#{t.folio}</td>
                                <td className="px-5 py-3.5 text-zinc-600">{t.owner}</td>
                                <td className="px-5 py-3.5">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${estadoBadge[t.estado_display]}`}>{estadoLabel[t.estado_display] ?? t.estado_display}</span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <div className="font-mono">{fmt(t.total)}</div>
                                    {Number(t.refunded_amount) > 0 && (
                                        <div className="text-xs text-rose-600">−{fmt(t.refunded_amount)} reembolsado</div>
                                    )}
                                </td>
                                <td className="px-5 py-3.5 text-zinc-400 text-xs">
                                    {t.cobrado_at ? formatDate(t.cobrado_at, tz) : formatDate(t.created_at, tz)}
                                </td>
                                <td className="px-5 py-3.5 text-center space-x-3">
                                    {t.token && (
                                        <a href={`/t/${t.token}`} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-zinc-700 hover:underline underline-offset-2">
                                            Ver
                                        </a>
                                    )}
                                    {t.estado === 'pagado' && t.saldo_reembolsable > 0 && (
                                        <button onClick={() => setRefundTicket(t)} className="text-xs text-red-600 hover:underline underline-offset-2">
                                            Reembolsar
                                        </button>
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

            {refundTicket && (
                <RefundModal ticket={refundTicket} paymentMethods={paymentMethods} onClose={() => setRefundTicket(null)} />
            )}
        </TenantLayout>
    );
}
