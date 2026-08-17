function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const estadoInfo = {
    pendiente: { label: 'Pendiente de pago', bg: '#fef9c3', color: '#92400e' },
    aprobado: { label: 'Pago confirmado', bg: '#dcfce7', color: '#16a34a' },
    rechazado: { label: 'Pago rechazado', bg: '#fee2e2', color: '#dc2626' },
    cancelado: { label: 'Solicitud cancelada', bg: '#f3f4f6', color: '#6b7280' },
    expirado: { label: 'Solicitud expirada', bg: '#f3f4f6', color: '#6b7280' },
};

export default function PublicPago({ negocio, solicitud }) {
    const primary = negocio.color_primario;
    const bg = negocio.color_fondo;
    const text = negocio.color_texto;
    const estado = estadoInfo[solicitud.estado] ?? estadoInfo.pendiente;

    return (
        <div style={{ background: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ background: bg, color: text, borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', maxWidth: '420px', width: '100%', overflow: 'hidden' }}>

                <div style={{ background: primary, padding: '1.5rem', textAlign: 'center' }}>
                    {negocio.logo_url ? (
                        <img src={negocio.logo_url} alt="Logo" style={{ maxHeight: '100px', maxWidth: '220px', objectFit: 'contain', margin: '0 auto 0.75rem' }} />
                    ) : null}
                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                        Solicitud de pago{solicitud.folio ? <> — <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{solicitud.folio}</span></> : null}
                    </div>
                    {negocio.nombre && (
                        <div style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>{negocio.nombre}</div>
                    )}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {solicitud.owner && (
                        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${primary}22` }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.2rem' }}>Cliente</div>
                            <div style={{ fontWeight: 600 }}>{solicitud.owner}</div>
                        </div>
                    )}

                    {solicitud.lines.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            {solicitud.lines.map((l, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: `1px solid ${primary}11` }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{l.nombre}</div>
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace', marginLeft: '1rem' }}>{fmt(l.subtotal)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {solicitud.notas && (
                        <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>{solicitud.notas}</div>
                    )}

                    <div style={{ background: `${primary}0d`, borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700 }}>
                            <span>Total a pagar</span>
                            <span style={{ fontFamily: 'monospace', color: primary }}>{fmt(solicitud.monto)}</span>
                        </div>
                    </div>

                    {solicitud.estado === 'pendiente' && solicitud.init_point ? (
                        <a
                            href={solicitud.init_point}
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                background: '#009ee3',
                                color: '#fff',
                                fontWeight: 600,
                                padding: '0.85rem 1rem',
                                borderRadius: '0.5rem',
                                textDecoration: 'none',
                            }}
                        >
                            Pagar con Mercado Pago
                        </a>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '0.4rem 1.25rem',
                                borderRadius: '999px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                background: estado.bg,
                                color: estado.color,
                            }}>
                                {estado.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
