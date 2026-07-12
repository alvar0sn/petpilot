import PortalLayout from '@/Layouts/PortalLayout';
import { useState } from 'react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const SERVICIO_LABEL = { guarderia: 'Guardería', hotel: 'Hotel', estetica: 'Estética', paseo: 'Paseo' };
const SERVICIO_COLOR = {
    guarderia: 'bg-blue-100 text-blue-700',
    hotel:     'bg-purple-100 text-purple-700',
    estetica:  'bg-pink-100 text-pink-700',
    paseo:     'bg-emerald-100 text-emerald-700',
};

function daysFrom(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function CreditChip({ credit }) {
    const low = credit.saldo_actual <= 2;
    return (
        <span className={`inline-block whitespace-nowrap text-xs px-1.5 py-0.5 rounded-full font-medium ${
            low ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' : SERVICIO_COLOR[credit.servicio_tipo] ?? 'bg-zinc-100 text-zinc-600'
        }`}>
            {SERVICIO_LABEL[credit.servicio_tipo] ?? credit.servicio_tipo} {credit.saldo_actual}/{credit.saldo_inicial}
        </span>
    );
}

export default function PortalMemberships({ tenant, owner, pets, active, historical }) {
    const tz = useTenantTimezone();
    const [petFilter, setPetFilter] = useState('all');
    const [showHistorico, setShowHistorico] = useState(false);

    const filteredActive = petFilter === 'all'
        ? active
        : active.filter(m => String(m.pet_id) === String(petFilter));

    const filteredHistorical = petFilter === 'all'
        ? historical
        : historical.filter(m => String(m.pet_id) === String(petFilter));

    return (
        <PortalLayout tenant={tenant} owner={owner} current="memberships">
            <div className="space-y-4">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Membresías</h2>

                {/* Filtro por mascota */}
                {pets.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setPetFilter('all')}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                petFilter === 'all'
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                            }`}>
                            Todas
                        </button>
                        {pets.map(p => (
                            <button key={p.id} onClick={() => setPetFilter(String(p.id))}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                    String(petFilter) === String(p.id)
                                        ? 'bg-zinc-900 text-white border-zinc-900'
                                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                }`}>
                                {p.nombre}
                            </button>
                        ))}
                    </div>
                )}

                {/* Membresías activas */}
                {filteredActive.length === 0 ? (
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
                        Sin membresías activas{petFilter !== 'all' ? ' para esta mascota' : ''}.
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-zinc-100 text-sm">
                            <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mascota</th>
                                    <th className="px-4 py-3 text-left">Plan</th>
                                    <th className="px-4 py-3 text-left">Créditos</th>
                                    <th className="px-4 py-3 text-left">Vence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {filteredActive.map(m => {
                                    const days = daysFrom(m.fecha_vencimiento);
                                    const urgent = days !== null && days <= 7;
                                    return (
                                        <tr key={m.id} className="hover:bg-zinc-50/60">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-zinc-900">{m.pet}</span>
                                                {m.congelada && (
                                                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">Congelada</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600">{m.plan}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {m.credits.map(c => <CreditChip key={c.servicio_tipo} credit={c} />)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={urgent ? 'text-rose-600 font-medium' : 'text-zinc-600'}>
                                                    {m.fecha_vencimiento ? formatDate(m.fecha_vencimiento, tz, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </span>
                                                {urgent && days >= 0 && (
                                                    <div className="text-xs text-rose-400">{days === 0 ? 'Hoy' : `${days}d`}</div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Historial */}
                {filteredHistorical.length > 0 && (
                    <div>
                        <button
                            onClick={() => setShowHistorico(v => !v)}
                            className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                            <span className={`transition-transform ${showHistorico ? 'rotate-90' : ''}`}>▶</span>
                            Historial ({filteredHistorical.length} membresías anteriores)
                        </button>

                        {showHistorico && (
                            <div className="mt-3 bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                                <table className="min-w-full divide-y divide-zinc-100 text-sm">
                                    <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Mascota</th>
                                            <th className="px-4 py-3 text-left">Plan</th>
                                            <th className="px-4 py-3 text-left">Inicio</th>
                                            <th className="px-4 py-3 text-left">Venció</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {filteredHistorical.map(m => (
                                            <tr key={m.id} className="text-zinc-500">
                                                <td className="px-4 py-3">{m.pet}</td>
                                                <td className="px-4 py-3">{m.plan}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    {m.fecha_inicio ? formatDate(m.fecha_inicio, tz, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {m.fecha_vencimiento ? formatDate(m.fecha_vencimiento, tz, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PortalLayout>
    );
}
