import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function Field({ label, hint, error, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
            {children}
            {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
        </div>
    );
}

export default function SystemSettings({ r2, resend }) {
    const { flash } = usePage().props;
    const [testingR2, setTestingR2] = useState(false);

    const r2Form = useForm({
        r2_key:        r2.r2_key ?? '',
        r2_secret:     r2.r2_secret ?? '',
        r2_bucket:     r2.r2_bucket ?? '',
        r2_account_id: r2.r2_account_id ?? '',
        r2_public_url: r2.r2_public_url ?? '',
    });

    const resendForm = useForm({
        resend_api_key:      resend.resend_api_key ?? '',
        resend_from_address: resend.resend_from_address ?? '',
        resend_from_name:    resend.resend_from_name ?? '',
    });

    function testR2() {
        setTestingR2(true);
        router.post(route('super-admin.system-settings.r2.test'), {}, {
            onFinish: () => setTestingR2(false),
        });
    }

    return (
        <SuperAdminLayout title="Infraestructura">
            {flash?.success && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {flash.error}
                </div>
            )}

            <div className="space-y-8">
                {/* R2 */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Cloudflare R2 — Almacenamiento</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Fotos y archivos subidos por los tenants. Con credenciales configuradas, el disco <code className="bg-gray-100 px-1 rounded">r2</code> queda disponible automáticamente.</p>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); r2Form.post(route('super-admin.system-settings.r2')); }} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Account ID" hint="Cloudflare Dashboard → R2 → Overview" error={r2Form.errors.r2_account_id}>
                                <input className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="abc123def456..."
                                    value={r2Form.data.r2_account_id}
                                    onChange={e => r2Form.setData('r2_account_id', e.target.value)} />
                            </Field>
                            <Field label="Bucket" error={r2Form.errors.r2_bucket}>
                                <input className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="petpilot-media"
                                    value={r2Form.data.r2_bucket}
                                    onChange={e => r2Form.setData('r2_bucket', e.target.value)} />
                            </Field>
                            <Field label="Access Key ID" error={r2Form.errors.r2_key}>
                                <input className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="API token → Access Key ID"
                                    value={r2Form.data.r2_key}
                                    onChange={e => r2Form.setData('r2_key', e.target.value)} />
                            </Field>
                            <Field label="Secret Access Key" error={r2Form.errors.r2_secret}>
                                <input type="password" className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="••••••••••••••••"
                                    value={r2Form.data.r2_secret}
                                    onChange={e => r2Form.setData('r2_secret', e.target.value)} />
                            </Field>
                            <Field label="URL pública" hint="Dominio personalizado o URL pública del bucket (r2.dev)" error={r2Form.errors.r2_public_url}>
                                <input className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="https://media.tudominio.com"
                                    value={r2Form.data.r2_public_url}
                                    onChange={e => r2Form.setData('r2_public_url', e.target.value)} />
                            </Field>
                            {r2Form.data.r2_account_id && (
                                <div className="flex items-end">
                                    <p className="text-xs text-gray-400 font-mono">
                                        Endpoint:<br />
                                        https://{r2Form.data.r2_account_id}.r2.cloudflarestorage.com
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="submit" disabled={r2Form.processing}
                                className="bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                                {r2Form.processing ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button type="button" onClick={testR2} disabled={testingR2 || !r2Form.data.r2_key}
                                className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors">
                                {testingR2 ? 'Probando…' : 'Probar conexión'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Resend */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Resend — Correo electrónico</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Con API key configurada, todos los emails del sistema salen por Resend automáticamente.</p>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); resendForm.post(route('super-admin.system-settings.resend')); }} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="API Key" hint="resend.com → API Keys" error={resendForm.errors.resend_api_key}>
                                <input type="password" className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="re_••••••••••••••••"
                                    value={resendForm.data.resend_api_key}
                                    onChange={e => resendForm.setData('resend_api_key', e.target.value)} />
                            </Field>
                            <Field label="Email remitente" error={resendForm.errors.resend_from_address}>
                                <input type="email" className="w-full border-gray-300 rounded-lg text-sm font-mono"
                                    placeholder="no-reply@tudominio.com"
                                    value={resendForm.data.resend_from_address}
                                    onChange={e => resendForm.setData('resend_from_address', e.target.value)} />
                            </Field>
                            <Field label="Nombre remitente" error={resendForm.errors.resend_from_name}>
                                <input className="w-full border-gray-300 rounded-lg text-sm"
                                    placeholder="Petpilot"
                                    value={resendForm.data.resend_from_name}
                                    onChange={e => resendForm.setData('resend_from_name', e.target.value)} />
                            </Field>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                            El dominio del email remitente debe estar verificado en Resend con los registros DNS correspondientes.
                        </div>
                        <button type="submit" disabled={resendForm.processing}
                            className="bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                            {resendForm.processing ? 'Guardando…' : 'Guardar'}
                        </button>
                    </form>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
