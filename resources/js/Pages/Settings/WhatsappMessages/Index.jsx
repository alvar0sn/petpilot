import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';
import { formatDateTime, useTenantTimezone } from '@/lib/datetime';

const statusStyles = {
    approved: ['bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', 'Aprobada'],
    pending: ['bg-amber-50 text-amber-700 ring-1 ring-amber-200', 'Pendiente'],
    rejected: ['bg-rose-50 text-rose-600 ring-1 ring-rose-200', 'Rechazada'],
    not_submitted: ['bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200', 'Sin someter'],
};

export default function WhatsappMessagesIndex({ triggers, whatsappEnabled, accountStatus, credits, creditMovements }) {
    const tz = useTenantTimezone();
    const ownConnected = !!accountStatus?.own_connected;

    function toggle(key) {
        router.post(route('whatsapp.toggle', key), {}, { preserveScroll: true });
    }

    function recharge() {
        router.post(route('whatsapp.credits.recharge'));
    }

    const movementLabels = {
        free_grant: 'Recarga gratis mensual',
        consumption: 'Mensaje enviado',
        purchase: 'Compra de créditos',
        manual_adjustment: 'Ajuste manual',
    };

    return (
        <TenantLayout title="Mensajes de WhatsApp">
            <p className="text-sm text-zinc-500 -mt-3 mb-5">Personaliza el texto de los mensajes automáticos que se mandan por WhatsApp.</p>

            {!whatsappEnabled && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
                    Los envíos por WhatsApp todavía no están activados para este negocio. Puedes dejar tus mensajes listos — se usarán en cuanto se active.
                </div>
            )}

            {!ownConnected && (
                <div className="bg-zinc-50 border border-zinc-200 text-zinc-600 text-sm rounded-xl p-4 mb-5">
                    Estos mensajes no se pueden editar porque todavía usas el número compartido — se manda el mensaje genérico del catálogo sin importar lo que escribas aquí. Pide a soporte que conecte tu propio número de WhatsApp para poder personalizarlos.
                </div>
            )}

            {credits && (
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-8">
                        <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wide">Créditos gratis</p>
                            <p className="text-xl font-semibold text-zinc-800">{credits.free}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wide">Créditos comprados</p>
                            <p className="text-xl font-semibold text-zinc-800">{credits.purchased}</p>
                        </div>
                    </div>
                    <button type="button" onClick={recharge}
                        className="text-sm bg-zinc-900 text-white font-semibold px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
                        Recargar créditos
                    </button>
                </div>
            )}

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-2 text-left">Nombre</th>
                            <th className="px-4 py-2 text-left">Idioma</th>
                            <th className="px-4 py-2 text-left">Categoría</th>
                            <th className="px-4 py-2 text-left">Mensaje</th>
                            <th className="px-4 py-2 text-left">Estado</th>
                            <th className="px-4 py-2 text-left">Última edición</th>
                            <th className="px-4 py-2 text-left">Activo</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {triggers.map(t => {
                            const [badgeClass, badgeLabel] = statusStyles[t.status] ?? statusStyles.not_submitted;
                            return (
                                <tr key={t.key}>
                                    <td className="px-4 py-2 max-w-[12rem]">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium text-zinc-800 truncate" title={t.label}>{t.label}</span>
                                            <span className="text-zinc-400 shrink-0 cursor-help" title={t.description}>
                                                <i className="ti ti-info-circle" style={{ fontSize: '15px' }} />
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-zinc-500 uppercase text-xs">{t.language ?? 'es'}</td>
                                    <td className="px-4 py-2 text-zinc-500 capitalize">{t.category}</td>
                                    <td className="px-4 py-2 text-zinc-500 max-w-xs truncate" title={t.body}>
                                        {t.body || '—'}
                                        {t.is_placeholder && <span className="text-amber-600 text-xs font-medium ml-1">(ejemplo)</span>}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${badgeClass}`}>{badgeLabel}</span>
                                    </td>
                                    <td className="px-4 py-2 text-zinc-400 text-xs whitespace-nowrap">
                                        {t.updated_at ? formatDateTime(t.updated_at, tz) : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <button type="button" role="switch" aria-checked={t.enabled} onClick={() => toggle(t.key)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.enabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${t.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {ownConnected ? (
                                            <Link href={route('whatsapp.edit', t.key)} className="text-sm text-zinc-700 hover:underline font-medium">
                                                Editar
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-zinc-300 font-medium cursor-not-allowed" title="Conecta tu propio número de WhatsApp para poder editar">
                                                Editar
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {creditMovements && creditMovements.data.length > 0 && (
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden mt-6">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 pt-4">Historial de créditos</p>
                    <table className="min-w-full divide-y divide-zinc-200 text-sm mt-2">
                        <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-2 text-left">Fecha</th>
                                <th className="px-4 py-2 text-left">Movimiento</th>
                                <th className="px-4 py-2 text-right">Créditos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {creditMovements.data.map(m => (
                                <tr key={m.id}>
                                    <td className="px-4 py-2 text-zinc-500 text-xs whitespace-nowrap">{formatDateTime(m.created_at, tz)}</td>
                                    <td className="px-4 py-2 text-zinc-700">{movementLabels[m.type] ?? m.type}</td>
                                    <td className={`px-4 py-2 text-right font-medium ${m.credits >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {m.credits >= 0 ? '+' : ''}{m.credits}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </TenantLayout>
    );
}
