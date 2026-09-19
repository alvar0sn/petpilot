import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const TYPE_LABELS = {
    tos: 'Términos y Condiciones',
    data_agreement: 'Convenio de Confidencialidad y Tratamiento de Datos',
};

function fmtDate(value) {
    return value ? new Date(value).toLocaleString('es-MX') : '—';
}

function NewVersionModal({ onClose }) {
    const form = useForm({
        type: 'tos',
        version: '',
        content: '',
        change_summary: '',
    });

    function submit(e) {
        e.preventDefault();
        form.post(route('super-admin.legal.store'), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4">
                <h3 className="font-semibold text-gray-800">Nueva versión de documento legal</h3>
                <p className="text-xs text-amber-600">
                    Al publicar, esta versión queda como vigente y se pedirá re-consentimiento a todos los tenants.
                </p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Documento</label>
                        <div className="flex gap-2">
                            {Object.entries(TYPE_LABELS).map(([key, label]) => (
                                <button key={key} type="button"
                                    onClick={() => form.setData('type', key)}
                                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                                        form.data.type === key
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                    }`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Versión *</label>
                        <input autoFocus placeholder="ej. 1.1"
                            className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.version}
                            onChange={e => form.setData('version', e.target.value)} />
                        {form.errors.version && <p className="text-red-500 text-xs mt-0.5">{form.errors.version}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Resumen de cambios (nota interna — el tenant solo ve "Hubo cambios", no este detalle)
                        </label>
                        <textarea rows={2}
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.change_summary}
                            onChange={e => form.setData('change_summary', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Contenido (HTML) *</label>
                        <textarea rows={10}
                            className="w-full border-gray-300 rounded-lg text-sm font-mono"
                            value={form.data.content}
                            onChange={e => form.setData('content', e.target.value)} />
                        {form.errors.content && <p className="text-red-500 text-xs mt-0.5">{form.errors.content}</p>}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!form.data.version || !form.data.content || form.processing}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                            {form.processing ? 'Publicando...' : 'Publicar versión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LegalIndex({ documents, acceptances, tenants, filters }) {
    const { flash } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [tenantId, setTenantId] = useState(filters.tenant_id ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    function applyFilters(overrides = {}) {
        router.get(route('super-admin.legal.index'), {
            tenant_id: overrides.tenant_id ?? tenantId ?? undefined,
            type: overrides.type ?? type ?? undefined,
            from: overrides.from ?? from ?? undefined,
            to: overrides.to ?? to ?? undefined,
        }, { preserveState: true, replace: true });
    }

    return (
        <SuperAdminLayout title="Documentos legales">
            {showModal && <NewVersionModal onClose={() => setShowModal(false)} />}

            {flash?.success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
                    {flash.success}
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Versiones publicadas</h2>
                <button onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Nueva versión
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {Object.entries(TYPE_LABELS).map(([typeKey, label]) => (
                    <div key={typeKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                        <div className="mt-2 divide-y divide-gray-100">
                            {documents.filter(d => d.type === typeKey).length === 0 && (
                                <p className="text-xs text-gray-400 py-2">Sin versiones publicadas.</p>
                            )}
                            {documents.filter(d => d.type === typeKey).map(doc => (
                                <div key={doc.id} className="py-2 flex items-center justify-between">
                                    <div>
                                        <span className="text-sm text-gray-800">v{doc.version}</span>
                                        {doc.is_current && (
                                            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                                                vigente
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">{fmtDate(doc.published_at)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="text-sm font-semibold text-gray-700 mb-3">Aceptaciones</h2>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Tenant</label>
                    <select className="border-gray-300 rounded-lg text-sm"
                        value={tenantId}
                        onChange={e => { setTenantId(e.target.value); applyFilters({ tenant_id: e.target.value }); }}>
                        <option value="">Todos</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Documento</label>
                    <select className="border-gray-300 rounded-lg text-sm"
                        value={type}
                        onChange={e => { setType(e.target.value); applyFilters({ type: e.target.value }); }}>
                        <option value="">Todos</option>
                        {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Desde</label>
                    <input type="date" className="border-gray-300 rounded-lg text-sm"
                        value={from}
                        onChange={e => { setFrom(e.target.value); applyFilters({ from: e.target.value }); }} />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                    <input type="date" className="border-gray-300 rounded-lg text-sm"
                        value={to}
                        onChange={e => { setTo(e.target.value); applyFilters({ to: e.target.value }); }} />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-2">Tenant</th>
                            <th className="px-4 py-2">Usuario</th>
                            <th className="px-4 py-2">Documento</th>
                            <th className="px-4 py-2">Aceptado</th>
                            <th className="px-4 py-2">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {acceptances.data.map(a => (
                            <tr key={a.id}>
                                <td className="px-4 py-2">{a.tenant?.nombre ?? '—'}</td>
                                <td className="px-4 py-2">
                                    <div>{a.user?.nombre ?? '—'}</div>
                                    <div className="text-xs text-gray-400">{a.user?.email}</div>
                                </td>
                                <td className="px-4 py-2">
                                    {a.document ? `${TYPE_LABELS[a.document.type] ?? a.document.type} v${a.document.version}` : '—'}
                                </td>
                                <td className="px-4 py-2">{fmtDate(a.accepted_at)}</td>
                                <td className="px-4 py-2 text-gray-400">{a.ip_address ?? '—'}</td>
                            </tr>
                        ))}
                        {acceptances.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin aceptaciones registradas.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {acceptances.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                        <span>Página {acceptances.current_page} de {acceptances.last_page}</span>
                        <div className="flex gap-2">
                            {acceptances.current_page > 1 && (
                                <button onClick={() => router.get(route('super-admin.legal.index'), {
                                    tenant_id: tenantId || undefined,
                                    type: type || undefined,
                                    from: from || undefined,
                                    to: to || undefined,
                                    page: acceptances.current_page - 1,
                                }, { preserveState: true })}
                                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs">
                                    ← Anterior
                                </button>
                            )}
                            {acceptances.current_page < acceptances.last_page && (
                                <button onClick={() => router.get(route('super-admin.legal.index'), {
                                    tenant_id: tenantId || undefined,
                                    type: type || undefined,
                                    from: from || undefined,
                                    to: to || undefined,
                                    page: acceptances.current_page + 1,
                                }, { preserveState: true })}
                                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs">
                                    Siguiente →
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}
