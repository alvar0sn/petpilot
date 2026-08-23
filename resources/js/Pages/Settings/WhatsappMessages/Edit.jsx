import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useMemo, useRef } from 'react';

const SAMPLE_BY_KEY = {
    name: 'Juan',
    full_name: 'Juan Pérez',
    phone: '55 1234 5678',
    ticket_url: 'https://vetrkt.app/t/abc123',
    total: '$500.00',
    folio: '1042',
    date: '23 ago 2026',
    pet_name: 'Firulais',
    pet_breed: 'Labrador',
    service_type: 'Vacunación',
    responsiva_url: 'https://vetrkt.app/r/abc123',
    checkin_date: '23 ago 2026',
    checkout_date: '25 ago 2026',
    age_years: '3',
    plan: 'Plan Mensual',
    expires_at: '31 ago 2026',
    days_before: '3',
    payment_link: 'https://vetrkt.app/pago/abc123',
};

function brace(n) {
    return '{' + '{' + n + '}' + '}';
}

export default function WhatsappMessagesEdit({ trigger }) {
    const textareaRef = useRef(null);
    const form = useForm({
        trigger: trigger.key,
        body: trigger.body,
        days_before: trigger.days_before,
    });

    const variableKeys = Object.keys(trigger.variables);

    function insertVar(index) {
        const el = textareaRef.current;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const placeholder = brace(index);
        const next = form.data.body.slice(0, start) + placeholder + form.data.body.slice(end);
        form.setData('body', next);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + placeholder.length;
        });
    }

    const preview = useMemo(() => {
        let text = form.data.body;
        variableKeys.forEach((key, i) => {
            const placeholder = brace(i + 1);
            text = text.split(placeholder).join(SAMPLE_BY_KEY[key] ?? placeholder);
        });
        return text || 'Vista previa del mensaje…';
    }, [form.data.body]);

    function handleSubmit(e) {
        e.preventDefault();
        form.post(route('whatsapp.update'));
    }

    return (
        <TenantLayout title={trigger.label}>
            <p className="text-sm text-zinc-400 -mt-3 mb-2">
                <Link href={route('whatsapp.index')} className="hover:underline">&larr; Mensajes de WhatsApp</Link>
            </p>
            <p className="text-sm text-zinc-500 mb-5">{trigger.description}</p>

            {trigger.is_placeholder && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
                    Este es un texto de ejemplo para que veas cómo armar tu mensaje — todavía no lo has guardado. Edítalo y da clic en "Guardar cambios" para activarlo.
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div>
                    <form onSubmit={handleSubmit}>
                        {trigger.has_days_before && (
                            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-4">
                                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Avisar con cuántos días de anticipación</label>
                                <select
                                    className="w-full border-gray-300 rounded-lg text-sm"
                                    value={form.data.days_before}
                                    onChange={e => form.setData('days_before', parseInt(e.target.value))}>
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
                                        <option key={n} value={n}>{n === 0 ? 'El mismo día que vence' : `${n} día${n > 1 ? 's' : ''} antes`}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-zinc-400 mt-1.5">El envío se hace entre las 8:00 am y las 8:00 pm del día seleccionado.</p>
                            </div>
                        )}

                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                            <textarea
                                ref={textareaRef}
                                rows={5}
                                required
                                className="w-full border-gray-300 rounded-lg text-sm"
                                value={form.data.body}
                                onChange={e => form.setData('body', e.target.value)}
                            />
                            {form.errors.body && <p className="text-rose-500 text-xs mt-1">{form.errors.body}</p>}

                            <p className="text-xs text-zinc-400 mt-2 mb-1.5">Toca una variable para agregarla:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {variableKeys.map((key, i) => (
                                    <button key={key} type="button" onClick={() => insertVar(i + 1)}
                                        className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-full px-2.5 py-1 transition-colors">
                                        + {trigger.variables[key]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {trigger.status === 'rejected' && trigger.rejected_reason && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4 mt-4">
                                Meta rechazó esta plantilla: {trigger.rejected_reason}
                            </div>
                        )}

                        <button type="submit" disabled={form.processing}
                            className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-colors mt-4">
                            {form.processing ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </form>
                </div>

                <div className="xl:sticky xl:top-8 xl:self-start">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Preview</p>
                    <div className="bg-[#e5ddd5] rounded-2xl p-6">
                        <div className="rounded-lg p-3 max-w-sm ml-auto" style={{ background: '#dcf8c6' }}>
                            <p className="text-sm text-zinc-800 whitespace-pre-wrap">{preview}</p>
                        </div>
                    </div>
                </div>
            </div>
        </TenantLayout>
    );
}
