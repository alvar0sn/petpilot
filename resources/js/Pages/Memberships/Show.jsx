import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const servicioLabel = { guarderia: 'Guardería', hotel: 'Hotel', estetica: 'Estética', paseo: 'Paseo' };
const servicioColor = { guarderia: 'bg-blue-100 text-blue-700', hotel: 'bg-purple-100 text-purple-700', estetica: 'bg-pink-100 text-pink-700', paseo: 'bg-green-100 text-green-700' };
const movTipoColor = { consumo: 'text-red-600', recarga: 'text-green-600', ajuste: 'text-zinc-600', vencimiento: 'text-zinc-400' };

function CreditCard({ credit, membershipId }) {
    const [showAdjust, setShowAdjust] = useState(false);
    const form = useForm({ credit_id: credit.id, cantidad: '', notas: '' });
    const pct = credit.saldo_inicial > 0 ? Math.round((credit.saldo_actual / credit.saldo_inicial) * 100) : 0;

    return (
        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${servicioColor[credit.servicio_tipo]}`}>
                    {servicioLabel[credit.servicio_tipo]}
                </span>
                <button onClick={() => setShowAdjust(v => !v)} className="text-xs text-zinc-700 underline-offset-2 hover:underline">Ajustar</button>
            </div>

            <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-zinc-800">{credit.saldo_actual}</span>
                <span className="text-sm text-zinc-400">/ {credit.saldo_inicial}</span>
            </div>

            <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${credit.saldo_actual <= 2 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
            </div>

            {credit.saldo_actual <= 2 && (
                <p className="text-xs text-red-500 mt-1">Saldo bajo</p>
            )}

            {showAdjust && (
                <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex gap-2">
                        <input type="number" className="flex-1 border-gray-300 rounded-lg text-sm" placeholder="Ej: 5 o -2" value={form.data.cantidad} onChange={e => form.setData('cantidad', e.target.value)} />
                    </div>
                    <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Motivo del ajuste" value={form.data.notas} onChange={e => form.setData('notas', e.target.value)} />
                    <button onClick={() => form.post(route('memberships.adjust', membershipId), { onSuccess: () => { setShowAdjust(false); form.reset('cantidad', 'notas'); } })}
                        disabled={form.processing}
                        className="w-full bg-zinc-900 text-white py-1.5 rounded-lg text-xs hover:bg-zinc-700 transition-colors">
                        Aplicar ajuste
                    </button>
                </div>
            )}
        </div>
    );
}

export default function MembershipShow({ membership }) {
    const tz = useTenantTimezone();
    const deactivateForm = useForm({});
    const freezeForm = useForm({});
    const unfreezeForm = useForm({});
    const [showEditDates, setShowEditDates] = useState(false);
    const datesForm = useForm({
        fecha_inicio: membership.fecha_inicio?.slice(0, 10) ?? '',
        fecha_vencimiento: membership.fecha_vencimiento?.slice(0, 10) ?? '',
    });

    function submitDates(e) {
        e.preventDefault();
        datesForm.put(route('memberships.update', membership.id), {
            preserveScroll: true,
            onSuccess: () => setShowEditDates(false),
        });
    }

    return (
        <TenantLayout title="Membresía">
            <div className="mb-4 flex items-center justify-between">
                <Link href={route('memberships.index')} className="text-sm text-zinc-500 hover:text-zinc-700">
                    ← Membresías
                </Link>
                {membership.activa && (
                    <div className="flex items-center gap-2">
                        {membership.congelada ? (
                            <button onClick={() => unfreezeForm.post(route('memberships.unfreeze', membership.id), { preserveScroll: true })}
                                disabled={unfreezeForm.processing}
                                className="text-xs bg-white border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-50 font-medium transition-colors">
                                Descongelar
                            </button>
                        ) : (
                            <button onClick={() => { if (confirm('¿Congelar esta membresía? Al descongelarla, la vigencia se extenderá automáticamente por los días que estuvo congelada.')) freezeForm.post(route('memberships.freeze', membership.id), { preserveScroll: true }); }}
                                disabled={freezeForm.processing}
                                className="text-xs bg-white border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-50 font-medium transition-colors">
                                Congelar
                            </button>
                        )}
                        <button onClick={() => { if (confirm('¿Desactivar esta membresía?')) deactivateForm.post(route('memberships.deactivate', membership.id)); }}
                            className="text-xs border border-red-300 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                            Desactivar
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Info */}
                <div className="space-y-3">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                        <div className="space-y-2 text-sm text-zinc-600">
                            <div>
                                <p className="text-xs text-zinc-400">Mascota</p>
                                <Link href={route('pets.show', membership.pet_id)} className="font-semibold text-zinc-800 hover:underline">
                                    {membership.pet?.nombre}
                                </Link>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">Dueño</p>
                                <p>{membership.pet?.owner?.nombre_completo}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-400">Plan</p>
                                <p className="font-medium">{membership.plan?.nombre}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-xs text-zinc-400">Inicio</p>
                                    <p>{formatDate(membership.fecha_inicio, tz)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Vencimiento</p>
                                    <p className={membership.activa && new Date(membership.fecha_vencimiento) < new Date() ? 'text-red-600 font-medium' : ''}>
                                        {formatDate(membership.fecha_vencimiento, tz)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${membership.activa ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'}`}>
                                    {membership.activa ? 'Activa' : 'Inactiva'}
                                </span>
                                {membership.congelada && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-200 inline-flex items-center">
                                        Congelada desde {formatDate(membership.congelada_desde, tz)}
                                    </span>
                                )}
                            </div>

                            <button onClick={() => setShowEditDates(v => !v)} className="text-xs text-zinc-700 underline-offset-2 hover:underline">
                                {showEditDates ? 'Cancelar' : 'Editar fechas'}
                            </button>

                            {showEditDates && (
                                <form onSubmit={submitDates} className="pt-2 border-t space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-zinc-400">Inicio</label>
                                            <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                                value={datesForm.data.fecha_inicio}
                                                onChange={e => datesForm.setData('fecha_inicio', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-400">Vencimiento</label>
                                            <input type="date" className="w-full border-gray-300 rounded-lg text-sm"
                                                value={datesForm.data.fecha_vencimiento}
                                                onChange={e => datesForm.setData('fecha_vencimiento', e.target.value)} />
                                        </div>
                                    </div>
                                    {datesForm.errors.fecha_inicio && <p className="text-red-500 text-xs">{datesForm.errors.fecha_inicio}</p>}
                                    {datesForm.errors.fecha_vencimiento && <p className="text-red-500 text-xs">{datesForm.errors.fecha_vencimiento}</p>}
                                    <button type="submit" disabled={datesForm.processing}
                                        className="w-full bg-zinc-900 text-white py-1.5 rounded-lg text-xs hover:bg-zinc-700 transition-colors">
                                        Guardar fechas
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Créditos */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide">Créditos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {membership.credits?.map(credit => (
                            <CreditCard key={credit.id} credit={credit} membershipId={membership.id} />
                        ))}
                    </div>

                    {/* Historial de movimientos */}
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide mb-2">Historial de movimientos</h3>
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                            <table className="min-w-full text-xs divide-y divide-zinc-100">
                                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Tipo</th>
                                        <th className="px-3 py-2 text-left">Servicio</th>
                                        <th className="px-3 py-2 text-right">Cantidad</th>
                                        <th className="px-3 py-2 text-right">Saldo</th>
                                        <th className="px-3 py-2 text-left">Notas</th>
                                        <th className="px-3 py-2 text-left">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {membership.credit_movements?.map(m => (
                                        <tr key={m.id}>
                                            <td className={`px-3 py-2 font-medium ${movTipoColor[m.tipo]}`}>{m.tipo}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${servicioColor[m.servicio_tipo]}`}>{servicioLabel[m.servicio_tipo]}</span>
                                            </td>
                                            <td className={`px-3 py-2 text-right font-mono font-bold ${m.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-zinc-600">{m.saldo_despues}</td>
                                            <td className="px-3 py-2 text-zinc-500">{m.notas}</td>
                                            <td className="px-3 py-2 text-zinc-400">{formatDate(m.created_at, tz)}</td>
                                        </tr>
                                    ))}
                                    {!membership.credit_movements?.length && (
                                        <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-400">Sin movimientos.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </TenantLayout>
    );
}
