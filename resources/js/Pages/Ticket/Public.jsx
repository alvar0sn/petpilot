function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function fmtDate(str) {
    if (!str) return '';
    return new Date(str).toLocaleString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const estadoLabel = { pagado: 'Pagado', cancelado: 'Cancelado', abierto: 'Pendiente' };

export default function PublicTicket({ ticket, config }) {
    const bg = config.color_fondo;
    const text = config.color_texto;
    const primary = config.color_primario;

    return (
        <div style={{ background: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ background: bg, color: text, borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', maxWidth: '420px', width: '100%', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ background: primary, padding: '1.5rem', textAlign: 'center' }}>
                    {config.logo_url ? (
                        <img src={config.logo_url} alt="Logo" style={{ maxHeight: '100px', maxWidth: '220px', objectFit: 'contain', margin: '0 auto 0.75rem' }} />
                    ) : null}
                    <div style={{ color: '#fff', fontSize: '0.875rem', opacity: 0.85 }}>Ticket de venta</div>
                    <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{ticket.folio}
                    </div>
                    {ticket.cobrado_at && (
                        <div style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.75, marginTop: '0.25rem' }}>
                            {fmtDate(ticket.cobrado_at)}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    {ticket.owner && (
                        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${primary}22` }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.2rem' }}>Cliente</div>
                            <div style={{ fontWeight: 600 }}>{ticket.owner}</div>
                        </div>
                    )}

                    {/* Lines */}
                    <div style={{ marginBottom: '1rem' }}>
                        {ticket.lines.map((l, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: `1px solid ${primary}11` }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{l.nombre}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>
                                        {l.cantidad} × {fmt(l.precio)}
                                    </div>
                                </div>
                                <div style={{ fontWeight: 600, fontFamily: 'monospace', marginLeft: '1rem' }}>
                                    {fmt(l.subtotal)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div style={{ background: `${primary}0d`, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                        {Number(ticket.discount_amount) > 0 && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                    <span style={{ opacity: 0.6 }}>Subtotal</span>
                                    <span style={{ fontFamily: 'monospace' }}>{fmt(ticket.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.25rem' }}>
                                    <span>Descuento</span>
                                    <span style={{ fontFamily: 'monospace' }}>-{fmt(ticket.discount_amount)}</span>
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                            <span>Total</span>
                            <span style={{ fontFamily: 'monospace', color: primary }}>{fmt(ticket.total)}</span>
                        </div>
                    </div>

                    {/* Estado */}
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 1rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: ticket.estado === 'pagado' ? '#dcfce7' : ticket.estado === 'cancelado' ? '#fee2e2' : '#fef9c3',
                            color: ticket.estado === 'pagado' ? '#16a34a' : ticket.estado === 'cancelado' ? '#dc2626' : '#92400e',
                        }}>
                            {estadoLabel[ticket.estado] ?? ticket.estado}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                {config.mensaje_pie && (
                    <div style={{ background: `${primary}0d`, padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.7, borderTop: `1px solid ${primary}22` }}>
                        {config.mensaje_pie}
                    </div>
                )}
            </div>
        </div>
    );
}
