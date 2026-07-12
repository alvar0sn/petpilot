import TenantLayout from '@/Layouts/TenantLayout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const ICONOS = {
    'ti-stethoscope': 'Estetoscopio',
    'ti-paw':         'Pata',
    'ti-heart':       'Corazón',
    'ti-star':        'Estrella',
    'ti-shield':      'Escudo',
    'ti-certificate': 'Certificado',
    'ti-clock':       'Reloj',
    'ti-scissors':    'Tijeras',
    'ti-home':        'Casa',
    'ti-medal':       'Medalla',
    'ti-bolt':        'Rayo',
    'ti-users':       'Equipo',
};

const SERVICIO_EMPTY = { imagen: '', titulo: '', texto: '' };
const BENEFICIO_DEFAULTS = [
    { icono: 'ti-stethoscope', titulo: '', texto: '' },
    { icono: 'ti-heart',       titulo: '', texto: '' },
    { icono: 'ti-paw',         titulo: '', texto: '' },
];

function Accordion({ id, label, badge, open, setOpen, children }) {
    const isOpen = open === id;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" onClick={() => setOpen(isOpen ? '' : id)}
                    className="flex items-center justify-between w-full px-5 py-4 text-left">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    {badge}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            {isOpen && <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">{children}</div>}
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
                   className="rounded text-blue-600" />
            {label}
        </label>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function LandingEditor({ tenant, cfg, branding, allStaff, allPlanes }) {
    const { props } = usePage();
    const flash = props.flash ?? {};

    const [open, setOpen] = useState('hero');
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        primary_color:      branding?.primary_color   ?? '#1a56db',
        secondary_color:    branding?.secondary_color ?? '',
        logo:               branding?.logo            ?? '',
        hero_show_name:     cfg?.hero?.show_name      ?? true,
        hero_tagline:       cfg?.hero?.tagline        ?? '',
        hero_image:         cfg?.hero?.image          ?? '',
        hero_cta_text:      cfg?.hero?.cta_text       ?? 'Contáctanos',
        about_enabled:      cfg?.about?.enabled       ?? true,
        about_text:         cfg?.about?.text          ?? '',
        about_image:        cfg?.about?.image         ?? '',
        servicios_enabled:  cfg?.servicios?.enabled   ?? true,
        servicios_title:    cfg?.servicios?.title     ?? 'Nuestros servicios',
        equipo_enabled:     cfg?.equipo?.enabled      ?? true,
        equipo_selected:    cfg?.equipo?.selected_ids ?? [],
        beneficios_enabled: cfg?.beneficios?.enabled  ?? true,
        membresias_enabled: cfg?.membresias?.enabled  ?? true,
        contacto_address:   cfg?.contacto?.address    ?? '',
        contacto_phone:     cfg?.contacto?.phone      ?? '',
        contacto_whatsapp:  cfg?.contacto?.whatsapp   ?? '',
        contacto_instagram: cfg?.contacto?.instagram  ?? '',
        contacto_facebook:  cfg?.contacto?.facebook   ?? '',
        contacto_website:   cfg?.contacto?.website    ?? '',
    });

    const [servicios, setServicios] = useState(
        cfg?.servicios?.items?.length
            ? [...cfg.servicios.items, ...Array(Math.max(0, 6 - cfg.servicios.items.length)).fill(SERVICIO_EMPTY)]
            : Array(6).fill(SERVICIO_EMPTY)
    );

    const [beneficios, setBeneficios] = useState(
        cfg?.beneficios?.items?.length === 3
            ? cfg.beneficios.items
            : BENEFICIO_DEFAULTS
    );

    function set(key, value) {
        setForm(f => ({ ...f, [key]: value }));
    }

    function updateServicio(i, field, value) {
        setServicios(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
    }

    function updateBeneficio(i, field, value) {
        setBeneficios(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
    }

    function toggleEquipo(id) {
        set('equipo_selected',
            form.equipo_selected.includes(id)
                ? form.equipo_selected.filter(x => x !== id)
                : [...form.equipo_selected, id]
        );
    }

    function submit(e) {
        e.preventDefault();
        setSaving(true);
        router.post(route('landing.update'), {
            ...form,
            servicio_imagen: servicios.map(s => s.imagen ?? ''),
            servicio_titulo: servicios.map(s => s.titulo ?? ''),
            servicio_texto:  servicios.map(s => s.texto  ?? ''),
            beneficio_icono:  beneficios.map(b => b.icono  ?? ''),
            beneficio_titulo: beneficios.map(b => b.titulo ?? ''),
            beneficio_texto:  beneficios.map(b => b.texto  ?? ''),
        }, { onFinish: () => setSaving(false) });
    }

    return (
        <TenantLayout title="Landing pública">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Landing del negocio</h1>
                    <p className="text-sm text-gray-500 mt-1">Página pública visible para todos.</p>
                </div>
                <a href={`/${tenant.slug}`} target="_blank"
                   className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <i className="ti ti-external-link text-base"></i>
                    Ver landing
                </a>
            </div>

            {flash.success && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
                    {flash.success}
                </div>
            )}

            <form onSubmit={submit} className="space-y-3 max-w-2xl">

                {/* ── HERO + BRANDING ── */}
                <Accordion id="hero" label="Hero" open={open} setOpen={setOpen}>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={form.hero_show_name}
                               onChange={e => set('hero_show_name', e.target.checked)}
                               className="rounded text-blue-600" />
                        Mostrar nombre del negocio en el hero
                    </label>
                    <Field label="Tagline (subtítulo)">
                        <input type="text" className={inputCls}
                               placeholder="Tu clínica veterinaria de confianza..."
                               value={form.hero_tagline}
                               onChange={e => set('hero_tagline', e.target.value)} />
                    </Field>
                    <Field label="URL de imagen de fondo">
                        <input type="url" className={inputCls} placeholder="https://..."
                               value={form.hero_image}
                               onChange={e => set('hero_image', e.target.value)} />
                        {form.hero_image && (
                            <img src={form.hero_image} className="mt-2 h-24 w-full object-cover rounded-lg" />
                        )}
                    </Field>
                    <Field label="Texto del botón CTA">
                        <input type="text" className={inputCls}
                               value={form.hero_cta_text}
                               onChange={e => set('hero_cta_text', e.target.value)} />
                    </Field>

                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-500 mb-3">Identidad visual</p>
                        <div className="space-y-3">
                            <Field label="URL del logo">
                                <input type="url" className={inputCls} placeholder="https://..."
                                       value={form.logo}
                                       onChange={e => set('logo', e.target.value)} />
                                {form.logo && (
                                    <img src={form.logo} className="mt-2 h-12 object-contain" />
                                )}
                            </Field>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Color primario</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.primary_color}
                                           onChange={e => set('primary_color', e.target.value)}
                                           className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5" />
                                    <span className="text-xs font-mono text-gray-500">{form.primary_color}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Accordion>

                {/* ── SOBRE NOSOTROS ── */}
                <Accordion id="about" label="Sobre nosotros" open={open} setOpen={setOpen}
                    badge={<Toggle label="Visible" checked={form.about_enabled} onChange={v => set('about_enabled', v)} />}>
                    <Field label="Descripción">
                        <textarea rows={4} className={inputCls}
                                  placeholder="Cuéntales sobre tu clínica..."
                                  value={form.about_text}
                                  onChange={e => set('about_text', e.target.value)} />
                    </Field>
                    <Field label="URL de imagen">
                        <input type="url" className={inputCls} placeholder="https://..."
                               value={form.about_image}
                               onChange={e => set('about_image', e.target.value)} />
                        {form.about_image && (
                            <img src={form.about_image} className="mt-2 h-24 w-full object-cover rounded-lg" />
                        )}
                    </Field>
                </Accordion>

                {/* ── SERVICIOS ── */}
                <Accordion id="servicios" label="Servicios" open={open} setOpen={setOpen}
                    badge={<Toggle label="Visible" checked={form.servicios_enabled} onChange={v => set('servicios_enabled', v)} />}>
                    <Field label="Título de la sección">
                        <input type="text" className={inputCls}
                               value={form.servicios_title}
                               onChange={e => set('servicios_title', e.target.value)} />
                    </Field>
                    <p className="text-xs text-gray-400">Agrega hasta 6 servicios. Los que no tengan título se omiten.</p>
                    {servicios.map((s, i) => (
                        <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-500">Servicio {i + 1}</p>
                            <Field label="Título *">
                                <input type="text" className={inputCls}
                                       placeholder="Ej: Consulta veterinaria"
                                       value={s.titulo}
                                       onChange={e => updateServicio(i, 'titulo', e.target.value)} />
                            </Field>
                            <Field label="Descripción">
                                <input type="text" className={inputCls}
                                       placeholder="Breve descripción del servicio"
                                       value={s.texto}
                                       onChange={e => updateServicio(i, 'texto', e.target.value)} />
                            </Field>
                            <Field label="URL de imagen">
                                <input type="url" className={inputCls} placeholder="https://..."
                                       value={s.imagen}
                                       onChange={e => updateServicio(i, 'imagen', e.target.value)} />
                                {s.imagen && (
                                    <img src={s.imagen} className="mt-2 h-20 w-full object-cover rounded-lg" />
                                )}
                            </Field>
                        </div>
                    ))}
                </Accordion>

                {/* ── BENEFICIOS ── */}
                <Accordion id="beneficios" label="Beneficios" open={open} setOpen={setOpen}
                    badge={<Toggle label="Visible" checked={form.beneficios_enabled} onChange={v => set('beneficios_enabled', v)} />}>
                    {beneficios.map((b, i) => (
                        <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-500">Tarjeta {i + 1}</p>
                            <Field label="Ícono">
                                <select className={inputCls} value={b.icono}
                                        onChange={e => updateBeneficio(i, 'icono', e.target.value)}>
                                    {Object.entries(ICONOS).map(([val, label]) => (
                                        <option key={val} value={val}>{label} ({val})</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Título">
                                <input type="text" className={inputCls}
                                       value={b.titulo}
                                       onChange={e => updateBeneficio(i, 'titulo', e.target.value)} />
                            </Field>
                            <Field label="Descripción">
                                <input type="text" className={inputCls}
                                       value={b.texto}
                                       onChange={e => updateBeneficio(i, 'texto', e.target.value)} />
                            </Field>
                        </div>
                    ))}
                </Accordion>

                {/* ── EQUIPO ── */}
                <Accordion id="equipo" label="Nuestro equipo" open={open} setOpen={setOpen}
                    badge={<Toggle label="Visible" checked={form.equipo_enabled} onChange={v => set('equipo_enabled', v)} />}>
                    <p className="text-xs text-gray-400">Selecciona quiénes aparecen. Si no seleccionas ninguno, aparecen todos.</p>
                    <div className="space-y-1">
                        {allStaff.map(m => (
                            <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox"
                                       checked={form.equipo_selected.includes(m.id) || form.equipo_selected.length === 0}
                                       onChange={() => toggleEquipo(m.id)}
                                       className="rounded text-blue-600" />
                                <span className="text-sm text-gray-700">{m.nombre} {m.apellido}</span>
                            </label>
                        ))}
                        {allStaff.length === 0 && (
                            <p className="text-xs text-gray-400 px-3">No hay colaboradores registrados aún.</p>
                        )}
                    </div>
                </Accordion>

                {/* ── MEMBRESÍAS ── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">Membresías</span>
                            <Toggle label="Visible" checked={form.membresias_enabled} onChange={v => set('membresias_enabled', v)} />
                        </div>
                        <span className="text-xs text-gray-400">Auto desde módulo de membresías</span>
                    </div>
                    {form.membresias_enabled && allPlanes.length > 0 && (
                        <div className="border-t border-gray-50 px-5 pb-4 pt-3 space-y-1">
                            {allPlanes.map(p => (
                                <div key={p.id} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                                    <span className="font-medium text-gray-700">{p.nombre}</span>
                                    <span className="text-gray-500">${Number(p.precio).toLocaleString('es-MX')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {form.membresias_enabled && allPlanes.length === 0 && (
                        <p className="px-5 pb-4 text-xs text-amber-600">No hay planes activos todavía.</p>
                    )}
                </div>

                {/* ── CONTACTO ── */}
                <Accordion id="contacto" label="Contacto" open={open} setOpen={setOpen}
                    badge={<span className="text-xs text-gray-400">Solo se muestra si hay datos</span>}>
                    {[
                        { key: 'contacto_address',   label: 'Dirección',                        placeholder: 'Calle 123, Ciudad' },
                        { key: 'contacto_phone',     label: 'Teléfono',                         placeholder: '+52 55 1234 5678' },
                        { key: 'contacto_whatsapp',  label: 'WhatsApp (con código de país)',     placeholder: '+5215512345678' },
                        { key: 'contacto_instagram', label: 'Instagram',                        placeholder: '@miclínica' },
                        { key: 'contacto_facebook',  label: 'Facebook (URL)',                   placeholder: 'https://facebook.com/...' },
                        { key: 'contacto_website',   label: 'Sitio web',                        placeholder: 'https://...' },
                    ].map(({ key, label, placeholder }) => (
                        <Field key={key} label={label}>
                            <input type="text" className={inputCls} placeholder={placeholder}
                                   value={form[key]}
                                   onChange={e => set(key, e.target.value)} />
                        </Field>
                    ))}
                </Accordion>

                <button type="submit" disabled={saving}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Guardando…' : 'Guardar landing'}
                </button>
            </form>
        </TenantLayout>
    );
}
