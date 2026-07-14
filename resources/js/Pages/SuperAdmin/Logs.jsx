import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

function LogBadge({ status }) {
    const color = status === 'success' ? 'bg-green-100 text-green-700'
        : status === 'skipped' ? 'bg-gray-100 text-gray-600'
        : 'bg-red-100 text-red-700';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{status}</span>;
}

export default function Logs({ contactLogs, webhookLogs, tenants, filters }) {
    const [tab, setTab] = useState('contacto');
    const [f, setF] = useState(filters);

    function applyFilters(e) {
        e.preventDefault();
        router.get(route('super-admin.logs'), f, { preserveState: true });
    }

    return (
        <SuperAdminLayout title="Logs GHL">
            <form onSubmit={applyFilters} className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Tenant</label>
                    <select className="border-gray-300 rounded-md text-sm"
                        value={f.tenant_id ?? ''} onChange={e => setF(p => ({ ...p, tenant_id: e.target.value }))}>
                        <option value="">Todos</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Estado</label>
                    <select className="border-gray-300 rounded-md text-sm"
                        value={f.status ?? ''} onChange={e => setF(p => ({ ...p, status: e.target.value }))}>
                        <option value="">Todos</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                        <option value="skipped">Skipped</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Desde</label>
                    <input type="date" className="border-gray-300 rounded-md text-sm"
                        value={f.date_from ?? ''} onChange={e => setF(p => ({ ...p, date_from: e.target.value }))} />
                </div>
                <div>
                    <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                    <input type="date" className="border-gray-300 rounded-md text-sm"
                        value={f.date_to ?? ''} onChange={e => setF(p => ({ ...p, date_to: e.target.value }))} />
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Filtrar</button>
            </form>

            <div className="flex gap-2 mb-4">
                <button onClick={() => setTab('contacto')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'contacto' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow'}`}>
                    Contacto ({contactLogs.total})
                </button>
                <button onClick={() => setTab('webhook')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'webhook' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow'}`}>
                    Webhooks ({webhookLogs.total})
                </button>
            </div>

            {tab === 'contacto' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Tenant</th>
                                <th className="px-4 py-3 text-left">Owner</th>
                                <th className="px-4 py-3 text-left">Acción</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                                <th className="px-4 py-3 text-left">HTTP</th>
                                <th className="px-4 py-3 text-left">Error</th>
                                <th className="px-4 py-3 text-left">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contactLogs.data.map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2">{log.tenant?.nombre}</td>
                                    <td className="px-4 py-2">{log.owner?.nombre_completo ?? '—'} <span className="text-gray-400">{log.owner?.telefono}</span></td>
                                    <td className="px-4 py-2 font-mono">{log.action}</td>
                                    <td className="px-4 py-2"><LogBadge status={log.status} /></td>
                                    <td className="px-4 py-2 text-gray-500">{log.http_code}</td>
                                    <td className="px-4 py-2 text-red-500 font-mono text-[10px] max-w-xs truncate" title={log.error_message ?? ''}>{log.error_message ?? '—'}</td>
                                    <td className="px-4 py-2 text-gray-400">{new Date(log.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                </tr>
                            ))}
                            {contactLogs.data.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin logs.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'webhook' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Tenant</th>
                                <th className="px-4 py-3 text-left">Tipo</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                                <th className="px-4 py-3 text-left">HTTP</th>
                                <th className="px-4 py-3 text-left">Error</th>
                                <th className="px-4 py-3 text-left">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {webhookLogs.data.map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2">{log.tenant?.nombre}</td>
                                    <td className="px-4 py-2 font-mono">{log.webhook_type}</td>
                                    <td className="px-4 py-2"><LogBadge status={log.status} /></td>
                                    <td className="px-4 py-2 text-gray-500">{log.http_code}</td>
                                    <td className="px-4 py-2 text-red-500 max-w-xs truncate">{log.error_message}</td>
                                    <td className="px-4 py-2 text-gray-400">{new Date(log.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                </tr>
                            ))}
                            {webhookLogs.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin logs.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </SuperAdminLayout>
    );
}
