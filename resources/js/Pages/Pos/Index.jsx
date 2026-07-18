import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─── Owner search ────────────────────────────────────────────────────────────

function OwnerSearch({ onSelect, placeholder = 'Buscar cliente...', autoFocus = false }) {
    const { version } = usePage();
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    async function search(val) {
        setQ(val);
        if (val.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const r = await axios.get(route('owners.index'), { params: { search: val }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
            setResults(r.data?.props?.owners?.data ?? []);
        } finally { setLoading(false); }
    }

    return (
        <div className="relative">
            <input className="w-full border-gray-300 rounded-lg text-sm" placeholder={placeholder}
                value={q} autoFocus={autoFocus} onChange={e => search(e.target.value)} />
            {results.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {results.map(o => (
                        <button key={o.id} onClick={() => { onSelect(o); setQ(''); setResults([]); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                            <span className="font-medium">{o.nombre_completo}</span>
                            <span className="text-gray-400 ml-2 font-mono">{o.telefono}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Category colors ─────────────────────────────────────────────────────────

const CAT_COLORS = {
    'General':    { inactiveTab: 'bg-slate-100 text-slate-700',   activeTab: 'bg-slate-600 text-white',   price: 'text-slate-600',   card: 'border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100',   badge: 'bg-slate-100 text-slate-500' },
    'Grooming':   { inactiveTab: 'bg-purple-100 text-purple-700', activeTab: 'bg-purple-600 text-white',  price: 'text-purple-600',  card: 'border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100', badge: 'bg-purple-100 text-purple-500' },
    'Membresías': { inactiveTab: 'bg-emerald-100 text-emerald-700', activeTab: 'bg-emerald-600 text-white', price: 'text-emerald-600', card: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100', badge: 'bg-emerald-100 text-emerald-500' },
};
const DEFAULT_CAT = { inactiveTab: 'bg-indigo-100 text-indigo-700', activeTab: 'bg-indigo-600 text-white', price: 'text-indigo-600', card: 'border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100', badge: 'bg-indigo-100 text-indigo-500' };
function catCol(nombre) { return CAT_COLORS[nombre] ?? DEFAULT_CAT; }

// ─── Desktop catalog panel (grid) ────────────────────────────────────────────

function CatalogPanel({ catalog, onAdd }) {
    const [activeCategory, setActiveCategory] = useState('todos');
    const [search, setSearch] = useState('');
    const allItems = catalog.flatMap(c => (c.items ?? []).map(i => ({ ...i, _catId: c.id, _catNombre: c.nombre })));
    const q = search.trim().toLowerCase();
    const visibleItems = q ? allItems.filter(i => i.nombre.toLowerCase().includes(q))
        : activeCategory === 'todos' ? allItems : allItems.filter(i => i._catId === activeCategory);
    const showBadge = q || activeCategory === 'todos';

    return (
        <div className="flex flex-col h-full">
            <input type="text" className="w-full border-gray-300 rounded-lg text-sm mb-3"
                placeholder="Buscar artículo..." value={search} onChange={e => setSearch(e.target.value)} />
            {!q && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                    <button onClick={() => setActiveCategory('todos')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategory === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        Todos
                    </button>
                    {catalog.map(c => {
                        const col = catCol(c.nombre);
                        const isActive = activeCategory === c.id;
                        return (
                            <button key={c.id} onClick={() => setActiveCategory(c.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive ? col.activeTab : col.inactiveTab}`}>
                                {c.nombre}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 overflow-y-auto flex-1 content-start">
                {visibleItems.map(item => {
                    const col = catCol(item._catNombre);
                    return (
                        <button key={item.id} onClick={() => onAdd?.(item)}
                            className={`border rounded-lg p-2 text-left transition-colors ${col.card} ${!onAdd ? 'cursor-default opacity-75' : ''}`}>
                            {showBadge && <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mb-1 ${col.badge}`}>{item._catNombre}</span>}
                            <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{item.nombre}</p>
                            <p className={`text-[11px] font-mono font-semibold mt-1 ${col.price}`}>{fmt(item.precio)}</p>
                        </button>
                    );
                })}
                {visibleItems.length === 0 && (
                    <p className="col-span-full text-sm text-gray-400 text-center py-6">
                        {q ? `Sin resultados para "${search}"` : 'Sin artículos en esta categoría.'}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Mobile catalog (list rows) ───────────────────────────────────────────────

function MobileCatalog({ catalog, onAdd }) {
    const [activeCategory, setActiveCategory] = useState('todos');
    const [search, setSearch] = useState('');
    const allItems = catalog.flatMap(c => (c.items ?? []).map(i => ({ ...i, _catId: c.id, _catNombre: c.nombre })));
    const q = search.trim().toLowerCase();
    const visibleItems = q ? allItems.filter(i => i.nombre.toLowerCase().includes(q))
        : activeCategory === 'todos' ? allItems : allItems.filter(i => i._catId === activeCategory);

    return (
        <div className="flex flex-col h-full">
            <input type="text" className="w-full border-gray-300 rounded-lg text-sm mb-3"
                placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
            {!q && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide">
                    <button onClick={() => setActiveCategory('todos')}
                        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === 'todos' ? 'bg-zinc-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        Todos
                    </button>
                    {catalog.map(c => {
                        const col = catCol(c.nombre);
                        const isActive = activeCategory === c.id;
                        return (
                            <button key={c.id} onClick={() => setActiveCategory(c.id)}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? col.activeTab : col.inactiveTab}`}>
                                {c.nombre}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="flex-1 overflow-y-auto">
                {visibleItems.map(item => {
                    const col = catCol(item._catNombre);
                    return (
                        <button key={item.id} onClick={() => onAdd?.(item)}
                            className="w-full flex items-center justify-between py-3.5 border-b border-gray-100 text-left active:bg-gray-50 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item._catNombre}</p>
                            </div>
                            <span className={`text-base font-semibold ml-4 shrink-0 ${col.price}`}>{fmt(item.precio)}</span>
                        </button>
                    );
                })}
                {visibleItems.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-10">
                        {q ? `Sin resultados para "${search}"` : 'Sin artículos.'}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Payment bottom sheet (mobile) ───────────────────────────────────────────

function PaymentSheet({ ticket, paymentMethods, onClose, onPaid }) {
    const [processing, setProcessing] = useState(false);

    async function payWith(methodId) {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.pay', ticket.id), {
                payments: [{ payment_method_id: methodId, monto: String(ticket.total) }],
            });
            onPaid({ folio: r.data.folio, waSent: r.data.wa_sent });
        } finally { setProcessing(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
            <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10 space-y-4"
                onClick={e => e.stopPropagation()}>
                <div className="text-center mb-2">
                    <p className="text-4xl font-bold text-gray-900">{fmt(ticket.total)}</p>
                    <p className="text-sm text-gray-400 mt-1">Importe total</p>
                </div>
                {paymentMethods.map((m, i) => (
                    <button key={m.id} onClick={() => payWith(m.id)} disabled={processing}
                        className={`w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 transition-colors disabled:opacity-50
                            ${i === 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-800 hover:bg-gray-50'}`}>
                        {m.nombre}
                    </button>
                ))}
                <button onClick={onClose} className="w-full py-3 text-sm text-gray-400">Cancelar</button>
            </div>
        </div>
    );
}

// ─── Mobile cart view ─────────────────────────────────────────────────────────

function MobileCart({ ticket, paymentMethods, discounts, onRefresh, onClear, onBack }) {
    const [processing, setProcessing] = useState(false);
    const [searchingOwner, setSearchingOwner] = useState(false);
    const [notes, setNotes] = useState(ticket.notas ?? '');
    const [showPayment, setShowPayment] = useState(false);
    const [paidState, setPaidState] = useState(null);

    async function assignOwner(owner) {
        setSearchingOwner(false);
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.owner', ticket.id), { owner_id: owner?.id ?? null });
            onRefresh(r.data.ticket);
        } finally { setProcessing(false); }
    }

    async function removeLine(lineId) {
        setProcessing(true);
        try {
            const r = await axios.delete(route('pos.tickets.lines.remove', ticket.id), { data: { line_id: lineId } });
            onRefresh(r.data.ticket);
        } finally { setProcessing(false); }
    }

    async function changeQty(lineId, delta) {
        const line = ticket.lines.find(l => l.id === lineId);
        if (!line) return;
        const newQty = Math.round(line.cantidad) + delta;
        if (newQty <= 0) { removeLine(lineId); return; }
        setProcessing(true);
        try {
            const r = await axios.patch(route('pos.tickets.lines.update', ticket.id), { line_id: lineId, cantidad: newQty });
            onRefresh(r.data.ticket);
        } catch (e) { console.error('changeQty:', e); }
        finally { setProcessing(false); }
    }

    async function applyDiscount(discountId) {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.discount', ticket.id), { discount_id: discountId || null });
            onRefresh(r.data.ticket);
        } finally { setProcessing(false); }
    }

    if (paidState) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <p className="font-bold text-green-700 text-lg mb-1">¡Cobrado!</p>
                <p className="text-gray-500 text-sm mb-6">Ticket #{paidState.folio}</p>
                {paidState.waSent && <p className="text-xs text-green-600 mb-4">📱 Ticket enviado por WhatsApp</p>}
                <button onClick={() => router.visit(route('pos.index'))}
                    className="w-full bg-zinc-900 text-white py-4 rounded-2xl text-base font-semibold">
                    Nueva venta
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
                    <button onClick={onBack} className="text-gray-500 hover:text-gray-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="font-semibold text-gray-900 flex-1">Carrito</h2>
                    <button onClick={() => {
                        if (confirm('¿Cancelar este ticket?')) {
                            router.post(route('pos.tickets.cancel', ticket.id), {}, {
                                onSuccess: () => onClear(),
                            });
                        }
                    }} className="text-xs text-red-400 hover:text-red-600">
                        Eliminar ticket
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Customer toggle */}
                    <div className="px-4 pt-4 pb-3">
                        {searchingOwner ? (
                            <OwnerSearch onSelect={assignOwner} autoFocus placeholder="Buscar cliente..." />
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setSearchingOwner(true)}
                                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
                                        ${ticket.owner ? 'border-gray-300 text-gray-800 bg-white' : 'border-gray-200 text-gray-500 bg-white'}`}>
                                    {ticket.owner ? ticket.owner.nombre_completo : 'Cliente'}
                                </button>
                                <button onClick={() => assignOwner(null)}
                                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
                                        ${!ticket.owner ? 'bg-zinc-900 text-white border-zinc-900' : 'border-gray-200 text-gray-500 bg-white'}`}>
                                    Sin cliente
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Lines */}
                    <div className="px-4 space-y-4 pb-4">
                        {ticket.lines?.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-6">Sin artículos</p>
                        )}
                        {ticket.lines?.map(line => (
                            <div key={line.id}>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{line.nombre_snapshot}</p>
                                        <p className="text-xs text-gray-400">{fmt(line.precio_snapshot)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => changeQty(line.id, -1)} disabled={processing}
                                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                                            −
                                        </button>
                                        <span className="text-sm font-medium w-5 text-center">{Math.round(line.cantidad)}</span>
                                        <button onClick={() => changeQty(line.id, 1)} disabled={processing}
                                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                                            +
                                        </button>
                                        <span className="text-sm font-semibold text-gray-800 w-16 text-right">{fmt(line.subtotal)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Discounts */}
                        {discounts.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 mb-2">Descuento</p>
                                <div className="flex flex-wrap gap-2">
                                    {discounts.map(d => (
                                        <button key={d.id} onClick={() => applyDiscount(ticket.discount?.id === d.id ? null : d.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                                                ${ticket.discount?.id === d.id ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                            {d.nombre} ({d.tipo === 'porcentaje' ? d.valor + '%' : fmt(d.valor)})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-500">Total</span>
                            <span className="text-xl font-bold text-gray-900">{fmt(ticket.total)}</span>
                        </div>

                        {/* Notes */}
                        <input className="w-full border-gray-200 rounded-xl text-sm bg-gray-50 py-3 px-4"
                            placeholder="Notas (opcional)" value={notes}
                            onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                {/* Sticky COBRAR */}
                <div className="p-4 bg-white border-t">
                    <button onClick={() => setShowPayment(true)}
                        disabled={!ticket.lines?.length || processing}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl text-base font-bold flex items-center justify-between px-6 disabled:opacity-40">
                        <span>COBRAR</span>
                        <span>{fmt(ticket.total)}</span>
                    </button>
                </div>
            </div>

            {showPayment && (
                <PaymentSheet
                    ticket={ticket}
                    paymentMethods={paymentMethods}
                    onClose={() => setShowPayment(false)}
                    onPaid={state => { setShowPayment(false); setPaidState(state); }}
                />
            )}
        </>
    );
}

// ─── Desktop ticket panel ─────────────────────────────────────────────────────

function TicketPanel({ ticket, paymentMethods, discounts, onRefresh, onClear }) {
    const [payMode, setPayMode] = useState(false);
    const [payments, setPayments] = useState([{ payment_method_id: paymentMethods[0]?.id ?? '', monto: '' }]);
    const [processing, setProcessing] = useState(false);
    const [cancelMode, setCancelMode] = useState(false);
    const [cancelComment, setCancelComment] = useState('');
    const [paidState, setPaidState] = useState(null);
    const [searchingOwner, setSearchingOwner] = useState(false);

    async function assignOwner(owner) {
        setSearchingOwner(false);
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.owner', ticket.id), { owner_id: owner?.id ?? null });
            onRefresh(r.data.ticket);
        } finally { setProcessing(false); }
    }

    function cancelTicket() {
        setProcessing(true);
        router.post(route('pos.tickets.cancel', ticket.id), { comentario_cancelacion: cancelComment }, {
            onSuccess: () => onClear(),
            onFinish: () => setProcessing(false),
        });
    }

    async function removeLine(lineId) {
        setProcessing(true);
        try {
            const r = await axios.delete(route('pos.tickets.lines.remove', ticket.id), { data: { line_id: lineId } });
            onRefresh(r.data.ticket);
        } catch (e) { console.error('removeLine:', e); }
        finally { setProcessing(false); }
    }

    async function changeQty(lineId, delta) {
        const line = ticket.lines.find(l => l.id === lineId);
        if (!line) return;
        const newQty = Math.round(line.cantidad) + delta;
        if (newQty <= 0) { removeLine(lineId); return; }
        setProcessing(true);
        try {
            const r = await axios.patch(route('pos.tickets.lines.update', ticket.id), { line_id: lineId, cantidad: newQty });
            onRefresh(r.data.ticket);
        } catch (e) { console.error('changeQty:', e); }
        finally { setProcessing(false); }
    }

    async function applyDiscount(discountId) {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.discount', ticket.id), { discount_id: discountId || null });
            onRefresh(r.data.ticket);
        } catch (e) { console.error('applyDiscount:', e); }
        finally { setProcessing(false); }
    }

    async function pay() {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.pay', ticket.id), { payments });
            setPaidState({ folio: r.data.folio, waSent: r.data.wa_sent });
        } catch (e) { console.error('pay:', e); }
        finally { setProcessing(false); }
    }

    const remainingToPay = ticket.total - payments.reduce((s, p) => s + Number(p.monto || 0), 0);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-gray-800">#{ticket.folio}</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setCancelMode(m => !m); setPayMode(false); }} className="text-xs text-red-400 hover:text-red-600">Cancelar ticket</button>
                    <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
            </div>

            {cancelMode && (
                <div className="px-4 py-3 bg-red-50 border-b border-red-100 space-y-2">
                    <p className="text-xs font-medium text-red-700">¿Cancelar ticket #{ticket.folio}?</p>
                    <input type="text" className="w-full border-red-200 rounded-lg text-xs py-1.5 bg-white"
                        placeholder="Motivo (opcional)" value={cancelComment} onChange={e => setCancelComment(e.target.value)} />
                    <div className="flex gap-2">
                        <button onClick={() => setCancelMode(false)} className="flex-1 border border-gray-300 py-1.5 rounded-lg text-xs text-gray-600">No cancelar</button>
                        <button onClick={cancelTicket} disabled={processing} className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-medium disabled:opacity-40">
                            {processing ? 'Cancelando...' : 'Sí, cancelar'}
                        </button>
                    </div>
                </div>
            )}

            <div className="px-3 py-2 border-b bg-white">
                {ticket.owner && !searchingOwner ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">👤</span>
                        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{ticket.owner.nombre_completo}</span>
                        <button onClick={() => setSearchingOwner(true)} className="text-xs text-gray-400 hover:text-indigo-600 shrink-0">cambiar</button>
                        <button onClick={() => assignOwner(null)} className="text-xs text-gray-300 hover:text-red-500 shrink-0">✕</button>
                    </div>
                ) : (
                    <OwnerSearch onSelect={assignOwner} placeholder="Buscar cliente..." autoFocus={searchingOwner} />
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {ticket.lines?.map(line => (
                    <div key={line.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-800 leading-tight truncate">{line.nombre_snapshot}</p>
                            <p className="text-gray-400 text-xs">{fmt(line.precio_snapshot)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => changeQty(line.id, -1)} disabled={processing}
                                className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-xs">
                                −
                            </button>
                            <span className="w-6 text-center text-xs font-medium">{Math.round(line.cantidad)}</span>
                            <button onClick={() => changeQty(line.id, 1)} disabled={processing}
                                className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-xs">
                                +
                            </button>
                        </div>
                        <span className="font-mono text-gray-700 text-xs w-14 text-right">{fmt(line.subtotal)}</span>
                        <button onClick={() => removeLine(line.id)} disabled={processing} className="text-gray-300 hover:text-red-400 text-xs disabled:opacity-30">✕</button>
                    </div>
                ))}
                {(!ticket.lines || ticket.lines.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-6">Agrega artículos del catálogo</p>
                )}
            </div>

            <div className="px-3 pb-2">
                <select className="w-full border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50"
                    value={ticket.discount?.id ?? ''} onChange={e => applyDiscount(e.target.value)}>
                    <option value="">Sin descuento</option>
                    {discounts.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre} ({d.tipo === 'porcentaje' ? d.valor + '%' : fmt(d.valor)})</option>
                    ))}
                </select>
            </div>

            <div className="border-t px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span className="font-mono">{fmt(ticket.subtotal)}</span>
                </div>
                {ticket.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span>Descuento ({ticket.discount?.nombre})</span>
                        <span className="font-mono">-{fmt(ticket.discount_amount)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 text-base">
                    <span>Total</span><span className="font-mono">{fmt(ticket.total)}</span>
                </div>
            </div>

            {paidState ? (
                <div className="px-4 pb-4 space-y-3 text-center">
                    <div className="py-4">
                        <div className="text-2xl mb-1">✅</div>
                        <p className="font-semibold text-green-700 text-sm">Ticket #{paidState.folio} cobrado</p>
                        {paidState.waSent && <p className="text-xs text-green-600 mt-1">📱 Ticket enviado por WhatsApp</p>}
                    </div>
                    <button onClick={() => router.visit(route('pos.index'))} className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                        Nueva venta
                    </button>
                </div>
            ) : !payMode ? (
                <div className="px-4 pb-4">
                    <button onClick={() => { setPayMode(true); setPayments([{ payment_method_id: paymentMethods[0]?.id ?? '', monto: String(ticket.total) }]); }}
                        disabled={!ticket.lines?.length || processing}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40">
                        Cobrar {fmt(ticket.total)}
                    </button>
                </div>
            ) : (
                <div className="px-4 pb-4 space-y-3">
                    {payments.map((p, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                            <select className="border-gray-300 rounded-lg text-sm" value={p.payment_method_id} onChange={e => {
                                const np = [...payments]; np[i].payment_method_id = e.target.value; setPayments(np);
                            }}>
                                {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                            <input type="number" step="0.01" className="border-gray-300 rounded-lg text-sm font-mono" value={p.monto} onChange={e => {
                                const np = [...payments]; np[i].monto = e.target.value; setPayments(np);
                            }} />
                        </div>
                    ))}
                    {Math.abs(remainingToPay) > 0.01 && (
                        <button onClick={() => setPayments([...payments, { payment_method_id: paymentMethods[0]?.id ?? '', monto: String(Math.max(0, remainingToPay).toFixed(2)) }])}
                            className="text-xs text-indigo-600 underline">+ Agregar método de pago</button>
                    )}
                    {remainingToPay > 0.01 && <p className="text-xs text-orange-600">Falta: {fmt(remainingToPay)}</p>}
                    <div className="flex gap-2">
                        <button onClick={() => setPayMode(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancelar</button>
                        <button onClick={pay} disabled={Math.abs(remainingToPay) > 0.01 || processing}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40">
                            {processing ? 'Procesando...' : 'Confirmar pago'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main POS ─────────────────────────────────────────────────────────────────

export default function PosIndex({ activeShift, catalog, paymentMethods, discounts, openTickets, openTicketId }) {
    const [currentTicket, setCurrentTicket] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [mobileView, setMobileView] = useState('catalog'); // 'catalog' | 'cart'

    // Ref mirrors currentTicket state so callbacks always see the latest value
    const ticketRef = useRef(null);
    function updateTicket(t) { ticketRef.current = t; setCurrentTicket(t); }

    useEffect(() => {
        if (openTicketId) loadTicket(openTicketId);
    }, [openTicketId]);

    async function newTicket() {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.store'));
            updateTicket(r.data.ticket);
            setMobileView('cart');
        } catch (e) {
            console.error('newTicket:', e);
        } finally { setProcessing(false); }
    }

    async function loadTicket(id) {
        const r = await axios.get(route('pos.tickets.show', id));
        updateTicket(r.data.ticket);
        setMobileView('cart');
    }

    async function addItem(item) {
        let ticket = ticketRef.current;
        if (!ticket) {
            setProcessing(true);
            try {
                const cr = await axios.post(route('pos.tickets.store'));
                ticket = cr.data.ticket;
                updateTicket(ticket);
                setMobileView('cart');
            } catch (e) {
                console.error('addItem (create ticket):', e);
                setProcessing(false);
                return;
            }
            setProcessing(false);
        }
        try {
            const r = await axios.post(route('pos.tickets.lines.add', ticket.id), { item_id: item.id, cantidad: 1 });
            updateTicket(r.data.ticket);
        } catch (e) {
            const d = e.response?.data;
            console.error('addLine err:', d?.error ?? d?.message ?? '(sin msg)', '| at:', d?.at ?? '?');
            console.error('addLine raw:', JSON.stringify(d));
        }
    }

    const cartItemCount = currentTicket?.lines?.reduce((s, l) => s + l.cantidad, 0) ?? 0;

    if (!activeShift) {
        return (
            <TenantLayout title="POS">
                <div className="flex flex-col items-center justify-center min-h-64 text-center">
                    <p className="text-gray-500 mb-4">No hay turno abierto. Abre un turno para comenzar.</p>
                    <Link href={route('pos.shift.index')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
                        Ir a Turnos
                    </Link>
                </div>
            </TenantLayout>
        );
    }

    return (
        <TenantLayout title="POS" noPadding>
            {/* ── MOBILE ── */}
            <div className="md:hidden flex flex-col h-[calc(100dvh-56px)]">
                {mobileView === 'catalog' ? (
                    <>
                        <div className="flex-1 overflow-hidden px-4 pt-4 flex flex-col">
                            {/* Open tickets */}
                            {openTickets.length > 0 && (
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                                    {openTickets.map(t => (
                                        <button key={t.id} onClick={() => loadTicket(t.id)}
                                            className={`shrink-0 border rounded-lg px-3 py-1.5 text-xs ${currentTicket?.id === t.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-gray-200 text-gray-600'}`}>
                                            #{t.folio} {t.owner ?? ''}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <MobileCatalog catalog={catalog} onAdd={addItem} />
                        </div>

                        {/* Sticky cart button */}
                        <div className="p-4 bg-white border-t">
                            {currentTicket ? (
                                <button onClick={() => setMobileView('cart')}
                                    className="w-full bg-blue-600 text-white py-4 rounded-2xl text-base font-bold flex items-center gap-3 px-5">
                                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                                        {cartItemCount}
                                    </span>
                                    <span className="flex-1 text-left">
                                        {currentTicket.owner ? currentTicket.owner.nombre_completo : 'Sin cliente'} · Carrito
                                    </span>
                                    <span>{fmt(currentTicket.total)}</span>
                                </button>
                            ) : (
                                <button onClick={newTicket} disabled={processing}
                                    className="w-full bg-blue-600 text-white py-4 rounded-2xl text-base font-bold disabled:opacity-50">
                                    + Nuevo ticket
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        {currentTicket && (
                            <MobileCart
                                ticket={currentTicket}
                                paymentMethods={paymentMethods}
                                discounts={discounts}
                                onRefresh={updateTicket}
                                onClear={() => { updateTicket(null); setMobileView('catalog'); }}
                                onBack={() => setMobileView('catalog')}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* ── DESKTOP ── */}
            <div className="hidden md:flex h-[calc(100vh-64px)]">
                {/* Catalog */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-700">Catálogo</h2>
                        <div className="flex gap-2">
                            <button onClick={newTicket} disabled={processing}
                                className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                + Nuevo ticket
                            </button>
                            <Link href={route('pos.history')} className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">Historial</Link>
                            <Link href={route('pos.shift.index')} className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">Turno</Link>
                        </div>
                    </div>
                    {openTickets.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                            {openTickets.map(t => (
                                <button key={t.id} onClick={() => loadTicket(t.id)}
                                    className={`shrink-0 border rounded-lg px-3 py-1.5 text-xs ${currentTicket?.id === t.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    #{t.folio} {t.owner ?? ''}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                        {catalog.length > 0 ? (
                            <CatalogPanel catalog={catalog} onAdd={addItem} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                Sin artículos. <Link href={route('settings.index')} className="ml-1 text-indigo-600 underline">Configurar catálogo</Link>
                            </div>
                        )}
                    </div>
                </div>
                {/* Ticket */}
                <div className="w-80 shrink-0 p-4 bg-gray-50 border-l overflow-hidden">
                    {currentTicket ? (
                        <TicketPanel ticket={currentTicket} paymentMethods={paymentMethods} discounts={discounts}
                            onRefresh={updateTicket} onClear={() => updateTicket(null)} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                            <p className="text-sm">Crea un nuevo ticket o selecciona uno abierto</p>
                        </div>
                    )}
                </div>
            </div>
        </TenantLayout>
    );
}
