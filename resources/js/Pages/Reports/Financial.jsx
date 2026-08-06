import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function InfoButton({ title, children }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} title={title}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-zinc-200 text-zinc-400 text-[10px] font-semibold hover:bg-zinc-50 hover:text-zinc-600 transition-colors ml-1.5 shrink-0">
                i
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-5 w-full max-w-sm space-y-3 text-sm text-zinc-600"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold text-zinc-800">{title}</h3>
                        <div>{children}</div>
                        <button onClick={() => setOpen(false)} className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function Card({ title, info, children, className = '' }) {
    return (
        <div className={`bg-white border border-zinc-100 shadow-sm rounded-xl p-5 ${className}`}>
            {title && (
                <h3 className="font-semibold text-zinc-700 mb-3 flex items-center">
                    {title}
                    {info}
                </h3>
            )}
            {children}
        </div>
    );
}

function CollapsibleSection({ title, count, countLabel = '', total, totalColor = 'text-zinc-800', defaultOpen = false, children, info }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                <span className="flex items-center font-semibold text-zinc-700">
                    <span className="text-left">
                        <div>{title}</div>
                        {count != null && <div className="text-xs font-normal text-zinc-400">{count} {countLabel}</div>}
                    </span>
                    {info}
                </span>
                <span className="flex items-center gap-3 text-sm">
                    {total != null && <span className={`font-mono font-semibold ${totalColor}`}>{fmt(total)}</span>}
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

const CAT_PALETTE = ['#0E7C6B', '#3FA894', '#8FCABB', '#C9E4DC', '#E1F0EA'];

function CategoryRow({ cat }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-zinc-100 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors text-left">
                <div>
                    <p className="font-medium text-zinc-800 text-sm">{cat.nombre}</p>
                    <p className="text-xs text-zinc-400">{cat.cantidad} vendido{cat.cantidad !== 1 ? 's' : ''} · {cat.porcentaje}%</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-zinc-800">{fmt(cat.total)}</span>
                    <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            {open && (
                <div className="px-4 pb-3 border-t border-zinc-50 divide-y divide-dashed divide-zinc-100">
                    {cat.items.map((it, i) => (
                        <div key={i} className="flex justify-between py-2 text-sm">
                            <span className="text-zinc-600">{it.nombre} <span className="text-zinc-400">×{it.cantidad}</span></span>
                            <span className="font-mono text-zinc-700">{fmt(it.total)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FinancialReport({ period, from, to, kpis, porCategoria, porMetodo, caja, turnosCount }) {
    const tz = useTenantTimezone();
    const [customFrom, setCustomFrom] = useState(from);
    const [customTo, setCustomTo] = useState(to);
    const [showCustom, setShowCustom] = useState(period === 'custom');

    function setPeriod(p) {
        if (p === 'custom') { setShowCustom(true); return; }
        setShowCustom(false);
        router.get(route('reports.financial'), { period: p }, { preserveState: true });
    }

    function applyCustom() {
        router.get(route('reports.financial'), { period: 'custom', from: customFrom, to: customTo }, { preserveState: true });
    }

    const ventasTotalCategorias = porCategoria.reduce((s, c) => s + c.total, 0);
    const topCategorias = porCategoria.slice(0, 5);
    const topCat = porCategoria[0];

    const exportUrl = route('reports.financial.export', { period, from, to });

    return (
        <TenantLayout title="Reporte financiero">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <p className="text-sm text-zinc-500">{formatDate(from, tz)} — {formatDate(to, tz)}</p>
                <a href={exportUrl}
                    className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-600 text-sm px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">
                    ↓ Descargar detalle (CSV)
                </a>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {[['today', 'Hoy'], ['week', 'Esta semana'], ['month', 'Este mes'], ['custom', 'Personalizado']].map(([val, label]) => (
                    <button key={val} onClick={() => setPeriod(val)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${period === val ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {showCustom && (
                <div className="flex gap-3 items-end bg-white border border-zinc-100 shadow-sm rounded-xl p-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Desde</label>
                        <input type="date" className="border-gray-300 rounded-lg text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Hasta</label>
                        <input type="date" className="border-gray-300 rounded-lg text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                    </div>
                    <button onClick={applyCustom} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                        Aplicar
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1 flex items-center">Ventas
                        <InfoButton title="Ventas">Suma de todos los tickets pagados en el período, ya con descuentos aplicados (antes de reembolsos, que se muestran aparte en Egresos).</InfoButton>
                    </p>
                    <p className="font-semibold text-lg text-emerald-700 font-mono">{fmt(kpis.ventas)}</p>
                </div>
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">Otros ingresos</p>
                    <p className="font-semibold text-lg text-emerald-700 font-mono">{fmt(kpis.otros_ingresos)}</p>
                </div>
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1 flex items-center">Egresos
                        <InfoButton title="Egresos">Suma de las salidas de caja registradas en el período (gastos operativos) más los reembolsos a clientes.</InfoButton>
                    </p>
                    <p className="font-semibold text-lg text-rose-600 font-mono">-{fmt(kpis.egresos)}</p>
                </div>
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1 flex items-center">Balance
                        <InfoButton title="Balance">Ventas + otros ingresos − egresos (incluyendo reembolsos). Es el efectivo/ingreso neto real del período, no solo lo vendido.</InfoButton>
                    </p>
                    <p className={`font-semibold text-lg font-mono ${kpis.balance >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}>{fmt(kpis.balance)}</p>
                </div>
            </div>

            <div className="space-y-3">
                {porCategoria.length > 0 && (
                    <Card title="De un vistazo" info={<InfoButton title="De un vistazo">Composición de las ventas del período por categoría de catálogo. El porcentaje es sobre el total vendido antes de descuentos.</InfoButton>}>
                        <div className="flex h-3.5 rounded-full overflow-hidden mb-3">
                            {topCategorias.map((c, i) => (
                                <div key={i} style={{ width: `${c.porcentaje}%`, background: CAT_PALETTE[i % CAT_PALETTE.length] }} />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                            {topCategorias.map((c, i) => (
                                <span key={i} className="text-xs text-zinc-500 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_PALETTE[i % CAT_PALETTE.length] }} />
                                    {c.nombre} <b className="text-zinc-700 font-semibold">{c.porcentaje}%</b>
                                </span>
                            ))}
                        </div>
                        {topCat && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                                <strong>{topCat.nombre}</strong> es tu categoría más fuerte del período — {fmt(topCat.total)} de {fmt(ventasTotalCategorias)} en ventas.
                            </p>
                        )}
                    </Card>
                )}

                <Card title="Por categoría de servicio">
                    {porCategoria.length === 0 ? (
                        <p className="text-sm text-zinc-400">Sin ventas en este período.</p>
                    ) : (
                        <div className="space-y-2">
                            {porCategoria.map((c, i) => <CategoryRow key={i} cat={c} />)}
                        </div>
                    )}
                </Card>

                <Card title="Por método de pago">
                    {porMetodo.length === 0 ? (
                        <p className="text-sm text-zinc-400">Sin ventas en este período.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {porMetodo.map((m, i) => (
                                <div key={i} className="bg-zinc-50 rounded-lg p-3">
                                    <p className="text-xs text-zinc-500">{m.nombre}</p>
                                    <p className="font-mono font-semibold text-zinc-800 mt-0.5">{fmt(m.total)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <CollapsibleSection
                    title="Ingresos y egresos de caja"
                    count={caja.ingresos.length + caja.egresos.length}
                    countLabel="movimientos"
                    total={caja.ingresos_total - caja.egresos_total}
                    totalColor={caja.ingresos_total - caja.egresos_total >= 0 ? 'text-emerald-700' : 'text-rose-600'}
                    defaultOpen
                    info={<InfoButton title="Ingresos y egresos de caja">Los egresos de este módulo son los mismos movimientos operativos capturados por turno (gasolina, nómina, etc.) — se suman aquí, no se vuelven a registrar. Los reembolsos a clientes también se listan como egreso.</InfoButton>}
                >
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1 bg-emerald-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ingresos de caja</p>
                                <p className="font-mono font-bold text-emerald-700 mt-1">+{fmt(caja.ingresos_total)}</p>
                            </div>
                            <div className="flex-1 bg-rose-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Egresos de caja</p>
                                <p className="font-mono font-bold text-rose-600 mt-1">-{fmt(caja.egresos_total)}</p>
                            </div>
                        </div>

                        {caja.ingresos.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Ingresos</p>
                                <div className="divide-y divide-zinc-50">
                                    {caja.ingresos.map((r, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 text-sm">
                                            <div>
                                                <p className="text-zinc-700">{r.label}</p>
                                                <p className="text-xs text-zinc-400">{r.nota}</p>
                                            </div>
                                            <span className="font-mono text-emerald-700 shrink-0 ml-3">+{fmt(r.monto)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {caja.egresos.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Egresos</p>
                                <div className="divide-y divide-zinc-50">
                                    {caja.egresos.map((r, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 text-sm">
                                            <div>
                                                <p className="text-zinc-700">{r.label}</p>
                                                <p className="text-xs text-zinc-400">{r.nota}</p>
                                            </div>
                                            <span className="font-mono text-rose-600 shrink-0 ml-3">-{fmt(r.monto)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center bg-zinc-50 rounded-lg px-3 py-2.5 text-sm font-semibold">
                            <span className="text-zinc-600">Neto del período</span>
                            <span className={`font-mono ${caja.ingresos_total - caja.egresos_total >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {fmt(caja.ingresos_total - caja.egresos_total)}
                            </span>
                        </div>
                    </div>
                </CollapsibleSection>

                <Card title="Origen">
                    <Link href={route('pos.shift.index')} className="flex items-center justify-between bg-zinc-50 rounded-lg px-3.5 py-2.5 text-sm hover:bg-zinc-100 transition-colors">
                        <span className="text-zinc-700 font-medium">{turnosCount} turno{turnosCount !== 1 ? 's' : ''} en el período</span>
                        <span className="text-emerald-700 font-medium">Ver →</span>
                    </Link>
                </Card>
            </div>
        </TenantLayout>
    );
}
