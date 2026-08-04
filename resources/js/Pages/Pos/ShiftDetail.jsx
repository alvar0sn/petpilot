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

function ItemsTable({ title, rows }) {
    if (!rows || rows.length === 0) return null;
    const total = rows.reduce((s, r) => s + Number(r.total), 0);

    return (
        <Card title={`${title} (${rows.length})`}>
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
                <tfoot>
                    <tr className="border-t border-zinc-100">
                        <td className="pt-2 font-semibold text-zinc-700" colSpan={2}>Total</td>
                        <td className="pt-2 text-right font-mono font-semibold">{fmt(total)}</td>
                    </tr>
                </tfoot>
            </table>
        </Card>
    );
}

function MovementForm({ shift }) {
    const [show, setShow] = useState(false);
    const moveForm = useForm({ tipo: 'deposito', monto: '', comentario: '' });

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-700">Movimientos de caja</h3>
                <button onClick={() => setShow(v => !v)}
                    className="text-xs bg-white border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">
                    {show ? 'Cancelar' : 'Nuevo movimiento'}
                </button>
            </div>

            {show && (
                <form onSubmit={e => {
                    e.preventDefault();
                    moveForm.post(route('pos.shift.movement', shift.id), { onSuccess: () => { setShow(false); moveForm.reset(); } });
                }} className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm" value={moveForm.data.tipo} onChange={e => moveForm.setData('tipo', e.target.value)}>
                                <option value="deposito">Depósito</option>
                                <option value="salida">Salida</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Monto</label>
                            <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm" value={moveForm.data.monto} onChange={e => moveForm.setData('monto', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Comentario</label>
                        <input className="w-full border-gray-300 rounded-lg text-sm" value={moveForm.data.comentario} onChange={e => moveForm.setData('comentario', e.target.value)} />
                    </div>
                    <button type="submit" disabled={moveForm.processing}
                        className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                        Registrar
                    </button>
                </form>
            )}

            {shift.cashMovements.length > 0 ? (
                <table className="min-w-full text-sm">
                    <tbody className="divide-y divide-zinc-50">
                        {shift.cashMovements.map(m => (
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
            ) : (
                <p className="text-xs text-zinc-400">Sin movimientos de caja.</p>
            )}
        </Card>
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

export default function ShiftDetail({ shift, efectivo, ventas, articulos, membresias, servicios, otros, reembolsos, tickets }) {
    const tz = useTenantTimezone();
    const abierto = shift.estado === 'abierto';

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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <MovementForm shift={shift} />
                    <CloseForm shift={shift} />
                </div>
            )}

            <Card title="Resumen de ventas" className="mb-4">
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
            </Card>

            <div className="space-y-4 mb-4">
                <ItemsTable title="Artículos vendidos" rows={articulos} />
                <ItemsTable title="Membresías vendidas" rows={membresias} />
                <ItemsTable title="Servicios vendidos" rows={servicios} />
                <ItemsTable title="Otros" rows={otros} />
            </div>

            {reembolsos.length > 0 && (
                <Card title={`Reembolsos (${reembolsos.length})`} className="mb-4">
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
                </Card>
            )}

            <Card title={`Ventas / Tickets (${tickets.length})`}>
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
                        {tickets.map(t => (
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
            </Card>
        </TenantLayout>
    );
}
