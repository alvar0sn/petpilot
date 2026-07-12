import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

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
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative">
            <input
                className="w-full border-gray-300 rounded-lg text-sm"
                placeholder={placeholder}
                value={q}
                autoFocus={autoFocus}
                onChange={e => search(e.target.value)}
            />
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

const CAT_COLORS = {
    'General':    { inactiveTab: 'bg-slate-100 text-slate-700 hover:bg-slate-200',   activeTab: 'bg-slate-600 text-white',   card: 'border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100',     price: 'text-slate-600',   badge: 'bg-slate-100 text-slate-500' },
    'Grooming':   { inactiveTab: 'bg-purple-100 text-purple-700 hover:bg-purple-200', activeTab: 'bg-purple-600 text-white',  card: 'border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100',   price: 'text-purple-600',  badge: 'bg-purple-100 text-purple-500' },
    'Membresías': { inactiveTab: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', activeTab: 'bg-emerald-600 text-white', card: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100', price: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-500' },
};
const DEFAULT_CAT = { inactiveTab: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', activeTab: 'bg-indigo-600 text-white', card: 'border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100', price: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-500' };
function catCol(nombre) { return CAT_COLORS[nombre] ?? DEFAULT_CAT; }

function CatalogPanel({ catalog, onAdd }) {
    const [activeCategory, setActiveCategory] = useState('todos');
    const [search, setSearch] = useState('');

    // Enrich each item with its category metadata
    const allItems = catalog.flatMap(c => (c.items ?? []).map(i => ({ ...i, _catId: c.id, _catNombre: c.nombre })));
    const q = search.trim().toLowerCase();

    const visibleItems = q
        ? allItems.filter(i => i.nombre.toLowerCase().includes(q))
        : activeCategory === 'todos'
            ? allItems
            : allItems.filter(i => i._catId === activeCategory);

    const showBadge = q || activeCategory === 'todos';

    return (
        <div className="flex flex-col h-full">
            <input
                type="text"
                className="w-full border-gray-300 rounded-lg text-sm mb-3"
                placeholder="Buscar artículo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            {!q && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                    <button
                        onClick={() => setActiveCategory('todos')}
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
                            {showBadge && (
                                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mb-1 ${col.badge}`}>
                                    {item._catNombre}
                                </span>
                            )}
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

function TicketPanel({ ticket, paymentMethods, discounts, onRefresh, onClear }) {
    const [payMode, setPayMode] = useState(false);
    const [payments, setPayments] = useState([{ payment_method_id: paymentMethods[0]?.id ?? '', monto: '' }]);
    const [processing, setProcessing] = useState(false);
    const [cancelMode, setCancelMode] = useState(false);
    const [cancelComment, setCancelComment] = useState('');
    const [paidState, setPaidState] = useState(null); // { folio, waSent }
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
        } finally { setProcessing(false); }
    }

    async function applyDiscount(discountId) {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.discount', ticket.id), { discount_id: discountId || null });
            onRefresh(r.data.ticket);
        } finally { setProcessing(false); }
    }

    async function pay() {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.pay', ticket.id), { payments });
            setPaidState({ folio: r.data.folio, waSent: r.data.wa_sent });
        } finally { setProcessing(false); }
    }

    const remainingToPay = ticket.total - payments.reduce((s, p) => s + Number(p.monto || 0), 0);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow overflow-hidden">
            {/* Header del ticket */}
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-gray-800">#{ticket.folio}</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setCancelMode(m => !m); setPayMode(false); }} className="text-xs text-red-400 hover:text-red-600">
                        Cancelar ticket
                    </button>
                    <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
            </div>

            {/* Confirmación de cancelación */}
            {cancelMode && (
                <div className="px-4 py-3 bg-red-50 border-b border-red-100 space-y-2">
                    <p className="text-xs font-medium text-red-700">¿Cancelar ticket #{ticket.folio}? Esta acción no se puede deshacer.</p>
                    <input
                        type="text"
                        className="w-full border-red-200 rounded-lg text-xs py-1.5 bg-white"
                        placeholder="Motivo (opcional)"
                        value={cancelComment}
                        onChange={e => setCancelComment(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button onClick={() => setCancelMode(false)} className="flex-1 border border-gray-300 py-1.5 rounded-lg text-xs text-gray-600">
                            No cancelar
                        </button>
                        <button onClick={cancelTicket} disabled={processing}
                            className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-xs font-medium disabled:opacity-40">
                            {processing ? 'Cancelando...' : 'Sí, cancelar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Cliente */}
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

            {/* Líneas del ticket */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {ticket.lines?.map(line => (
                    <div key={line.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                            <span className="text-gray-800">{line.nombre_snapshot}</span>
                            <span className="text-gray-400 text-xs ml-1">×{line.cantidad}</span>
                        </div>
                        <span className="font-mono text-gray-700">{fmt(line.subtotal)}</span>
                        <button onClick={() => removeLine(line.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    </div>
                ))}
                {(!ticket.lines || ticket.lines.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-6">Agrega artículos del catálogo</p>
                )}
            </div>

            {/* Descuento */}
            <div className="px-3 pb-2">
                <select className="w-full border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50" value={ticket.discount?.id ?? ''} onChange={e => applyDiscount(e.target.value)}>
                    <option value="">Sin descuento</option>
                    {discounts.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre} ({d.tipo === 'porcentaje' ? d.valor + '%' : fmt(d.valor)})</option>
                    ))}
                </select>
            </div>

            {/* Totales */}
            <div className="border-t px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">{fmt(ticket.subtotal)}</span>
                </div>
                {ticket.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span>Descuento ({ticket.discount?.nombre})</span>
                        <span className="font-mono">-{fmt(ticket.discount_amount)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 text-base">
                    <span>Total</span>
                    <span className="font-mono">{fmt(ticket.total)}</span>
                </div>
            </div>

            {/* Post-pago */}
            {paidState ? (
                <div className="px-4 pb-4 space-y-3 text-center">
                    <div className="py-4">
                        <div className="text-2xl mb-1">✅</div>
                        <p className="font-semibold text-green-700 text-sm">Ticket #{paidState.folio} cobrado</p>
                        {paidState.waSent && (
                            <p className="text-xs text-green-600 mt-1">📱 Ticket enviado por WhatsApp</p>
                        )}
                    </div>
                    <button
                        onClick={() => router.visit(route('pos.index'))}
                        className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                        Nueva venta
                    </button>
                </div>
            ) : !payMode ? (
                <div className="px-4 pb-4">
                    <button
                        onClick={() => { setPayMode(true); setPayments([{ payment_method_id: paymentMethods[0]?.id ?? '', monto: String(ticket.total) }]); }}
                        disabled={!ticket.lines?.length || processing}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                    >
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

                    {remainingToPay > 0.01 && (
                        <p className="text-xs text-orange-600">Falta: {fmt(remainingToPay)}</p>
                    )}

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

export default function PosIndex({ activeShift, catalog, paymentMethods, discounts, openTickets, openTicketId }) {
    const [currentTicket, setCurrentTicket] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (openTicketId) loadTicket(openTicketId);
    }, [openTicketId]);

    async function newTicket() {
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.store'));
            setCurrentTicket(r.data.ticket);
        } finally { setProcessing(false); }
    }

    async function loadTicket(id) {
        const r = await axios.get(route('pos.tickets.show', id));
        setCurrentTicket(r.data.ticket);
    }

    async function addItem(item) {
        if (!currentTicket) return;
        setProcessing(true);
        try {
            const r = await axios.post(route('pos.tickets.lines.add', currentTicket.id), {
                item_id: item.id,
                cantidad: 1,
            });
            setCurrentTicket(r.data.ticket);
        } finally { setProcessing(false); }
    }

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
            <div className="flex h-[calc(100vh-64px)]">
                {/* Panel izquierdo: catálogo */}
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-700">Catálogo</h2>
                        <div className="flex gap-2">
                            <button onClick={newTicket} disabled={processing}
                                className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                + Nuevo ticket
                            </button>
                            <Link href={route('pos.history')} className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
                                Historial
                            </Link>
                            <Link href={route('pos.shift.index')} className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
                                Turno
                            </Link>
                        </div>
                    </div>

                    {/* Tickets abiertos */}
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
                            <CatalogPanel catalog={catalog} onAdd={currentTicket ? addItem : null} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                Sin artículos en el catálogo. <Link href={route('settings.index')} className="ml-1 text-indigo-600 underline">Configurar catálogo</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel derecho: ticket activo */}
                <div className="w-80 shrink-0 p-4 bg-gray-50 border-l overflow-hidden">
                    {currentTicket ? (
                        <TicketPanel
                            ticket={currentTicket}
                            paymentMethods={paymentMethods}
                            discounts={discounts}
                            onRefresh={setCurrentTicket}
                            onClear={() => setCurrentTicket(null)}
                        />
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
