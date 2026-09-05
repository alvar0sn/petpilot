import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function AdjustForm({ tenant }) {
    const [delta, setDelta] = useState('');

    function submit(e) {
        e.preventDefault();
        if (!delta) return;
        router.post(route('super-admin.whatsapp-credits.adjust', tenant.id), { delta: parseInt(delta, 10) }, {
            preserveScroll: true,
            onSuccess: () => setDelta(''),
        });
    }

    return (
        <form onSubmit={submit} className="flex items-center gap-1.5">
            <input type="number" placeholder="±créditos" value={delta}
                onChange={e => setDelta(e.target.value)}
                className="w-24 border-gray-300 rounded-lg text-xs" />
            <button type="submit" className="text-xs bg-gray-800 text-white rounded-lg px-2 py-1.5 hover:bg-gray-700">
                Ajustar
            </button>
        </form>
    );
}

function OverrideInput({ tenant }) {
    const [value, setValue] = useState(tenant.whatsapp_free_credits_monthly ?? '');

    function submit() {
        router.put(route('super-admin.whatsapp-credits.override', tenant.id), {
            whatsapp_free_credits_monthly: value === '' ? null : parseInt(value, 10),
        }, { preserveScroll: true });
    }

    return (
        <div className="flex items-center gap-1.5">
            <input type="number" min="0" placeholder="default" value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={submit}
                className="w-24 border-gray-300 rounded-lg text-xs" />
        </div>
    );
}

export default function WhatsappCreditsIndex({ tenants, settings }) {
    const { flash, errors } = usePage().props;

    const settingsForm = useForm({
        whatsapp_free_credits_default: settings.whatsapp_free_credits_default,
        whatsapp_recharge_credits: settings.whatsapp_recharge_credits,
        whatsapp_recharge_price: settings.whatsapp_recharge_price,
    });

    function submitSettings(e) {
        e.preventDefault();
        settingsForm.post(route('super-admin.whatsapp-credits.settings'));
    }

    return (
        <SuperAdminLayout title="Créditos de WhatsApp">
            {flash?.success && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                    {flash.success}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Configuración global</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Aplica a todos los tenants salvo que tengan un default mensual propio.</p>
                </div>
                <form onSubmit={submitSettings} className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Créditos gratis por default / mes</label>
                        <input type="number" min="0" className="w-full border-gray-300 rounded-lg text-sm"
                            value={settingsForm.data.whatsapp_free_credits_default}
                            onChange={e => settingsForm.setData('whatsapp_free_credits_default', e.target.value)} />
                        {errors?.whatsapp_free_credits_default && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_free_credits_default}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Créditos por paquete de recarga</label>
                        <input type="number" min="1" className="w-full border-gray-300 rounded-lg text-sm"
                            value={settingsForm.data.whatsapp_recharge_credits}
                            onChange={e => settingsForm.setData('whatsapp_recharge_credits', e.target.value)} />
                        {errors?.whatsapp_recharge_credits && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_recharge_credits}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Precio por paquete (MXN)</label>
                        <input type="number" min="0.01" step="0.01" className="w-full border-gray-300 rounded-lg text-sm"
                            value={settingsForm.data.whatsapp_recharge_price}
                            onChange={e => settingsForm.setData('whatsapp_recharge_price', e.target.value)} />
                        {errors?.whatsapp_recharge_price && <p className="text-red-500 text-xs mt-1">{errors.whatsapp_recharge_price}</p>}
                    </div>
                    <div className="sm:col-span-3 flex justify-end">
                        <button type="submit" disabled={settingsForm.processing}
                            className="text-sm bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Créditos por tenant</h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-2 text-left">Tenant</th>
                            <th className="px-4 py-2 text-right">Gratis</th>
                            <th className="px-4 py-2 text-right">Comprados</th>
                            <th className="px-4 py-2 text-left">Default mensual propio</th>
                            <th className="px-4 py-2 text-left">Próximo reset</th>
                            <th className="px-4 py-2 text-left">Ajuste manual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tenants.map(t => (
                            <tr key={t.id}>
                                <td className="px-4 py-2 font-medium text-gray-800">{t.nombre}</td>
                                <td className="px-4 py-2 text-right">{t.whatsapp_free_credits}</td>
                                <td className="px-4 py-2 text-right">{t.whatsapp_purchased_credits}</td>
                                <td className="px-4 py-2"><OverrideInput tenant={t} /></td>
                                <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                                    {t.whatsapp_credits_reset_at ?? '—'}
                                </td>
                                <td className="px-4 py-2"><AdjustForm tenant={t} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SuperAdminLayout>
    );
}
