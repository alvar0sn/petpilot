import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatDateTime, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function Card({ title, children, className = '' }) {
    return (
        <div className={`bg-white border border-zinc-100 shadow-sm rounded-xl p-5 ${className}`}>
            {title && <h3 className="font-semibold text-zinc-700 mb-3">{title}</h3>}
            {children}
        </div>
    );
}

function Row({ label, value, strong = false, color = '' }) {
    return (
        <div className="flex justify-between text-sm py-1">
            <span className="text-zinc-500">{label}</span>
            <span className={`font-mono ${strong ? 'font-semibold text-zinc-800' : 'text-zinc-700'} ${color}`}>{value}</span>
        </div>
    );
}

/**
 * Sección desplegable para resúmenes de venta: el header ya muestra el total
 * de cosas/servicios (count) y el monto total, sin necesidad de abrirla.
 */
function CollapsibleSection({ title, count, countLabel = '', total, defaultOpen = false, children, empty = false }) {
    const [open, setOpen] = useState(defaultOpen);
    if (empty) return null;

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                <span className="font-semibold text-zinc-700">{title}</span>
                <span className="flex items-center gap-3 text-sm">
                    {count != null && <span className="text-zinc-400">{count} {countLabel}</span>}
                    {total != null && <span className="font-mono font-semibold text-zinc-800">{fmt(total)}</span>}
                    <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            {open && <div className="px-5 pb-5 border-t border-zinc-50 pt-4">{children}</div>}
        </div>
    );
}

function ItemsTable({ title, rows }) {
    if (!rows || rows.length === 0) return null;
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const cantidad = rows.reduce((s, r) => s + Number(r.cantidad), 0);

    return (
        <CollapsibleSection title={title} count={cantidad} countLabel="uds." total={total}>
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="text-xs text-zinc-400 uppercase tracking-wide">
                        <th className="text-left pb-2">Producto</th>
                        <th className="text-right pb-2">Cantidad</th>
                        <th className="text-right pb-2">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td className="py-2 text-zinc-700">{r.nombre}</td>
                            <td className="py-2 text-right font-mono">{r.cantidad}</td>
                            <td className="py-2 text-right font-mono">{fmt(r.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </CollapsibleSection>
    );
}

function CashMovementsSummary({ shift }) {
    const movs = shift.cashMovements ?? [];
    if (movs.length === 0) return null;

    const depositos = movs.filter(m => m.tipo === 'deposito').reduce((s, m) => s + Number(m.monto), 0);
    const salidas = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + Number(m.monto), 0);
    const neto = depositos - salidas;

    return (
        <CollapsibleSection title="Movimientos de caja" count={movs.length} countLabel="movimientos" total={neto}>
            <table className="min-w-full text-sm">
                <tbody className="divide-y divide-zinc-50">
                    {movs.map(m => (
                        <tr key={m.id}>
                            <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${m.tipo === 'deposito' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'}`}>
                                    {m.tipo}
                                </span>
                            </td>
                            <td className="py-2 font-mono">{fmt(m.monto)}</td>
                            <td className="py-2 text-zinc-500">{m.comentario}</td>
                            <td className="py-2 text-zinc-400 text-xs text-right">{m.user}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs text-zinc-400 mt-3">Los movimientos se registran desde el POS.</p>
        </CollapsibleSection>
    );
}

function CloseForm({ shift }) {
    const closeForm = useForm({ efectivo_contado: '' });

    return (
        <Card title="Cerrar turno">
            <form onSubmit={e => { e.preventDefault(); closeForm.post(route('pos.shift.close', shift.id)); }} className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Efectivo contado en caja</label>
                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm"
                        value={closeForm.data.efectivo_contado} onChange={e => closeForm.setData('efectivo_contado', e.target.value)} placeholder="0.00" />
                </div>
                <button type="submit" disabled={closeForm.processing}
                    className="self-end border border-red-300 text-red-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                    Cerrar turno
                </button>
            </form>
        </Card>
    );
}

const TICKETS_PER_PAGE = 20;

export default function ShiftDetail({ shift, efectivo, ventas, articulos, membresias, servicios, otros, porCategoria, reembolsos, tickets }) {
    const tz = useTenantTimezone();
    const abierto = shift.estado === 'abierto';
    const [ticketPage, setTicketPage] = useState(1);
    const totalTicketPages = Math.max(1, Math.ceil(tickets.length / TICKETS_PER_PAGE));
    const pagedTickets = tickets.slice((ticketPage - 1) * TICKETS_PER_PAGE, ticketPage * TICKETS_PER_PAGE);

    const totalCosasVendidas = [...articulos, ...membresias, ...servicios, ...otros]
        .reduce((s, r) => s + Number(r.cantidad), 0);

    return (
        <TenantLayout title="Detalle del turno">
            <div className="flex items-center gap-3 mb-4">
                <Link href={route('pos.shift.index')} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">← Turnos</Link>
                <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Detalle del turno</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${abierto ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'}`}>
                    {abierto ? 'Abierto' : 'Cerrado'}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <Card title="Información">
                    <Row label="Abierto por" value={shift.abierto_por} />
                    <Row label="Apertura" value={formatDateTime(shift.fecha_apertura, tz)} />
                    <Row label="Cierre" value={shift.fecha_cierre ? formatDateTime(shift.fecha_cierre, tz) : '—'} />
                    <Row label="Cerrado por" value={shift.cerrado_por ?? '—'} />
                </Card>

                <Card title="Efectivo en caja">
                    <Row label="Fondo inicial" value={fmt(efectivo.fondo_inicial)} />
                    <Row label="+ Cobros en efectivo" value={fmt(efectivo.cobros_efectivo)} color="text-emerald-700" />
                    <Row label="− Reembolsos efectivo" value={fmt(efectivo.reembolsos_efectivo)} color="text-rose-600" />
                    {(efectivo.depositos > 0 || efectivo.salidas > 0) && (
                        <>
                            <Row label="+ Depósitos" value={fmt(efectivo.depositos)} color="text-emerald-700" />
                            <Row label="− Salidas" value={fmt(efectivo.salidas)} color="text-rose-600" />
                        </>
                    )}
                    <Row label="Efectivo teórico" value={fmt(efectivo.efectivo_teorico)} strong />
                    {!abierto && (
                        <>
                            <Row label="Contado al cierre" value={fmt(efectivo.efectivo_contado)} />
                            <Row label="Diferencia" value={`${efectivo.diferencia >= 0 ? '+' : ''}${fmt(efectivo.diferencia)}`} strong
                                color={efectivo.diferencia >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
                        </>
                    )}
                </Card>
            </div>

            {abierto && (
                <div className="mb-4">
                    <CloseForm shift={shift} />
                </div>
            )}

            <div className="space-y-3">
                <CollapsibleSection title="Resumen de ventas" total={ventas.netas} defaultOpen>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Row label="Ventas brutas" value={fmt(ventas.brutas)} />
                            <Row label="− Reembolsos" value={fmt(ventas.reembolsos)} color="text-rose-600" />
                            <Row label="− Descuentos" value={fmt(ventas.descuentos)} color="text-rose-600" />
                            <Row label="Ventas netas" value={fmt(ventas.netas)} strong />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Por método</p>
                            {ventas.por_metodo.length === 0 && <p className="text-xs text-zinc-400">Sin ventas.</p>}
                            {ventas.por_metodo.map((m, i) => (
                                <Row key={i} label={`${m.nombre} (${m.cantidad})`} value={fmt(m.total)} />
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Ventas por categoría" count={totalCosasVendidas} countLabel="uds." total={ventas.brutas} empty={porCategoria.length === 0}>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-xs text-zinc-400 uppercase tracking-wide">
                                <th className="text-left pb-2">Categoría</th>
                                <th className="text-right pb-2">Cantidad</th>
                                <th className="text-right pb-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {porCategoria.map((c, i) => (
                                <tr key={i}>
                                    <td className="py-2 text-zinc-700">{c.nombre}</td>
                                    <td className="py-2 text-right font-mono">{c.cantidad}</td>
                                    <td className="py-2 text-right font-mono">{fmt(c.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CollapsibleSection>

                <ItemsTable title="Artículos vendidos" rows={articulos} />
                <ItemsTable title="Membresías vendidas" rows={membresias} />
                <ItemsTable title="Servicios vendidos" rows={servicios} />
                <ItemsTable title="Otros" rows={otros} />

                <CashMovementsSummary shift={shift} />

                {reembolsos.length > 0 && (
                    <CollapsibleSection title="Reembolsos" count={reembolsos.length} countLabel="reembolsos"
                        total={reembolsos.reduce((s, r) => s + Number(r.monto), 0)}>
                        <div className="divide-y divide-zinc-50">
                            {reembolsos.map(r => (
                                <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                                    <div>
                                        <p className="text-zinc-700">{r.cliente} <span className="text-zinc-400 text-xs">— ticket #{r.folio}</span></p>
                                        <p className="text-xs text-zinc-400">{formatDateTime(r.created_at, tz)} · {r.metodo} · {r.motivo}</p>
                                    </div>
                                    <span className="font-mono text-rose-600">-{fmt(r.monto)}</span>
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>
                )}

                <CollapsibleSection title="Ventas / Tickets" count={tickets.length} countLabel="tickets"
                    total={tickets.reduce((s, t) => s + Number(t.total), 0)} defaultOpen>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-xs text-zinc-400 uppercase tracking-wide">
                                <th className="text-left pb-2">Ticket</th>
                                <th className="text-left pb-2">Hora</th>
                                <th className="text-left pb-2">Cliente</th>
                                <th className="text-left pb-2">Método</th>
                                <th className="text-right pb-2">Descuento</th>
                                <th className="text-right pb-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {pagedTickets.map(t => (
                                <tr key={t.id}>
                                    <td className="py-2 font-mono">
                                        {t.token ? (
                                            <a href={`/t/${t.token}`} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">
                                                #{t.folio}
                                            </a>
                                        ) : `#${t.folio}`}
                                    </td>
                                    <td className="py-2 text-zinc-500">{t.cobrado_at ? formatDateTime(t.cobrado_at, tz) : '—'}</td>
                                    <td className="py-2 text-zinc-700">{t.cliente}</td>
                                    <td className="py-2 text-zinc-500">{t.metodo || '—'}</td>
                                    <td className="py-2 text-right font-mono">{Number(t.descuento) > 0 ? fmt(t.descuento) : '—'}</td>
                                    <td className="py-2 text-right font-mono">{fmt(t.total)}</td>
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr><td colSpan={6} className="py-6 text-center text-zinc-400">Sin ventas en este turno.</td></tr>
                            )}
                        </tbody>
                    </table>

                    {totalTicketPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 text-sm">
                            <button onClick={() => setTicketPage(p => Math.max(1, p - 1))} disabled={ticketPage === 1}
                                className="px-3 py-1 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 transition-colors">
                                ← Anterior
                            </button>
                            {Array.from({ length: totalTicketPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setTicketPage(p)}
                                    className={`px-3 py-1 rounded-lg transition-colors ${p === ticketPage ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setTicketPage(p => Math.min(totalTicketPages, p + 1))} disabled={ticketPage === totalTicketPages}
                                className="px-3 py-1 rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 transition-colors">
                                Siguiente →
                            </button>
                        </div>
                    )}
                </CollapsibleSection>
            </div>
        </TenantLayout>
    );
}
