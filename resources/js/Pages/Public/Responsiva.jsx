import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';

function fmtDate(str) {
    if (!str) return '';
    return new Date(str + 'T12:00:00').toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

function fmtDateTime(str) {
    if (!str) return '';
    return new Date(str).toLocaleString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

export default function PublicResponsiva({ negocio, appointment, texto, recepcion, token, firmado, firmado_at, firmante }) {
    const primary = negocio.color_primario || '#4f46e5';
    const canvasRef = useRef(null);
    const padRef = useRef(null);
    const [hasStroke, setHasStroke] = useState(false);
    const [justSigned, setJustSigned] = useState(false);

    const form = useForm({ nombre: '', firma: '' });

    useEffect(() => {
        if (firmado || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const pad = new SignaturePad(canvas, { minWidth: 1, maxWidth: 2.5, penColor: '#18181b' });
        padRef.current = pad;

        function resize() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d').scale(ratio, ratio);
            pad.clear();
        }
        resize();
        window.addEventListener('resize', resize);

        pad.addEventListener('endStroke', () => setHasStroke(!pad.isEmpty()));

        return () => {
            window.removeEventListener('resize', resize);
            pad.off();
        };
    }, [firmado]);

    function clearSignature() {
        padRef.current?.clear();
        setHasStroke(false);
    }

    function submit(e) {
        e.preventDefault();
        if (!padRef.current || padRef.current.isEmpty()) return;

        form.setData('firma', padRef.current.toDataURL('image/png'));
        form.post(route('responsiva.sign', token), {
            onSuccess: () => setJustSigned(true),
            preserveScroll: true,
        });
    }

    const showConfirmation = firmado || justSigned;

    return (
        <div style={{ background: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ background: '#fff', color: '#1f2937', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', maxWidth: '480px', width: '100%', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ background: primary, padding: '1.5rem', textAlign: 'center' }}>
                    {negocio.logo_url ? (
                        <img src={negocio.logo_url} alt="Logo" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', margin: '0 auto 0.75rem' }} />
                    ) : null}
                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>{negocio.nombre}</div>
                    <div style={{ color: '#fff', fontSize: '0.85rem', opacity: 0.85, marginTop: '0.15rem' }}>Carta responsiva</div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* Datos de la cita */}
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>Mascota</div>
                            <div style={{ fontWeight: 600 }}>{appointment.pet ?? '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>Propietario</div>
                            <div style={{ fontWeight: 600 }}>{appointment.owner ?? '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5 }}>Fecha</div>
                            <div style={{ fontWeight: 600 }}>{fmtDate(appointment.fecha)}</div>
                        </div>
                    </div>

                    {/* Texto legal */}
                    <div style={{
                        fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-line', color: '#374151',
                        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                        padding: '1rem', maxHeight: '260px', overflowY: 'auto', marginBottom: '1.25rem',
                    }}>
                        {texto}
                    </div>

                    {/* Condiciones documentadas en la recepción */}
                    {recepcion && (recepcion.hallazgos?.length > 0 || recepcion.estado_manto || recepcion.accesorios || recepcion.notas_sesion) && (
                        <div style={{
                            fontSize: '0.8rem', color: '#3f3f46', background: '#fafafa',
                            border: '1px solid #e4e4e7', borderRadius: '0.5rem',
                            padding: '0.85rem 1rem', marginBottom: '1.25rem',
                        }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#71717a', fontWeight: 600, marginBottom: '0.4rem' }}>
                                Condiciones al momento de la recepción
                            </div>
                            {recepcion.hallazgos?.length > 0 && (
                                <div style={{ marginBottom: '0.3rem' }}>
                                    <strong>Análisis visual:</strong>{' '}
                                    {recepcion.hallazgos.map(h => (
                                        <span key={h} style={{ display: 'inline-block', background: '#fee2e2', color: '#b91c1c', borderRadius: '3px', padding: '1px 6px', margin: '2px 3px 2px 0', fontSize: '0.75rem' }}>
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {recepcion.estado_manto && (
                                <div style={{ padding: '1.5px 0' }}><strong>Estado del manto:</strong> {recepcion.estado_manto}</div>
                            )}
                            {recepcion.accesorios && (
                                <div style={{ padding: '1.5px 0' }}><strong>Accesorios recibidos:</strong> {recepcion.accesorios}</div>
                            )}
                            {recepcion.notas_sesion && (
                                <div style={{ padding: '1.5px 0' }}><strong>Notas:</strong> {recepcion.notas_sesion}</div>
                            )}
                        </div>
                    )}

                    {showConfirmation ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                            <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: '0.25rem' }}>Responsiva firmada</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                {firmante && <>Firmado por <strong>{firmante}</strong><br /></>}
                                {firmado_at && fmtDateTime(firmado_at)}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem', color: '#4b5563' }}>
                                Nombre completo de quien firma
                            </label>
                            <input
                                type="text"
                                value={form.data.nombre}
                                onChange={e => form.setData('nombre', e.target.value)}
                                placeholder="Nombre y apellidos"
                                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.9rem', marginBottom: '1rem' }}
                            />
                            {form.errors.nombre && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-0.75rem', marginBottom: '0.75rem' }}>{form.errors.nombre}</p>}

                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem', color: '#4b5563' }}>
                                Firma
                            </label>
                            <canvas
                                ref={canvasRef}
                                style={{ width: '100%', height: '150px', border: '1px solid #d1d5db', borderRadius: '0.5rem', touchAction: 'none', background: '#fff' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Firma con el dedo o el mouse</span>
                                <button type="button" onClick={clearSignature} style={{ fontSize: '0.75rem', color: primary, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Limpiar
                                </button>
                            </div>
                            {form.errors.firma && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '-1rem', marginBottom: '1rem' }}>{form.errors.firma}</p>}

                            <button
                                type="submit"
                                disabled={!hasStroke || !form.data.nombre.trim() || form.processing}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
                                    background: primary, color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                                    cursor: 'pointer', opacity: (!hasStroke || !form.data.nombre.trim() || form.processing) ? 0.4 : 1,
                                }}
                            >
                                {form.processing ? 'Enviando...' : 'Firmar y aceptar'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
