import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function MetricCard({ label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-zinc-100 text-zinc-700',
        green: 'bg-green-50 text-green-700',
        blue: 'bg-sky-50 text-sky-700',
        purple: 'bg-violet-50 text-violet-700',
        orange: 'bg-orange-50 text-orange-700',
    };
    return (
        <div className={`rounded-xl p-4 ${colors[color]}`}>
            <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs opacity-75 mt-0.5">{sub}</p>}
        </div>
    );
}

function AlertCard({ label, count, href, color = 'yellow' }) {
    if (!count) return null;
    const colors = { yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800', red: 'border-red-300 bg-red-50 text-red-800' };
    return (
        <div className={`border rounded-lg p-3 flex items-center justify-between ${colors[color]}`}>
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold">{count}</p>
            </div>
            {href && (
                <Link href={href} className="text-xs underline opacity-70 hover:opacity-100">Ver →</Link>
            )}
        </div>
    );
}

const periods = [
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
];

export default function Dashboard({ period, from, to, metricas, alertas, recordatorios_hoy }) {
    function changePeriod(p) {
        router.get(route('dashboard'), { period: p }, { preserveState: false });
    }

    const hasAlertas = alertas.sin_mascota + alertas.recordatorios_vencidos + alertas.membresias_saldo_bajo + alertas.membresias_vencen_semana > 0;

    return (
        <TenantLayout title="Dashboard">
            {/* Selector de período */}
            <div className="flex gap-2 mb-6">
                {periods.map(p => (
                    <button key={p.value} onClick={() => changePeriod(p.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p.value ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
                        {p.label}
                    </button>
                ))}
                <span className="ml-auto text-xs text-zinc-400 self-center">
                    {new Date(from + 'T00:00:00').toLocaleDateString('es-MX')} — {new Date(to + 'T00:00:00').toLocaleDateString('es-MX')}
                </span>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard label="Servicios registrados" value={metricas.total_eventos} color="indigo" />
                <MetricCard label="Estéticas" value={metricas.esteticas} color="purple" />
                <MetricCard label="Nuevas mascotas" value={metricas.nuevas_mascotas} color="blue" />
                <MetricCard label="Ingresos POS" value={fmt(metricas.ingresos_pos)} color="green" />
                <MetricCard label="Vacunas" value={metricas.vacunas} color="orange" />
                <MetricCard label="Consultas" value={metricas.consultas} color="blue" />
                <MetricCard label="Créditos consumidos" value={metricas.creditos_consumidos} color="indigo" />
                <MetricCard label="Recordatorios enviados" value={metricas.recordatorios_enviados} color="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Alertas */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide">Alertas</h2>
                    {!hasAlertas && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">
                            Sin alertas pendientes ✓
                        </div>
                    )}
                    <AlertCard label="Clientes sin mascota" count={alertas.sin_mascota} href={route('owners.index')} color="yellow" />
                    <AlertCard label="Recordatorios vencidos" count={alertas.recordatorios_vencidos} color="red" />
                    <AlertCard label="Membresías con saldo bajo" count={alertas.membresias_saldo_bajo} href={route('memberships.index')} color="red" />
                    <AlertCard label="Membresías vencen esta semana" count={alertas.membresias_vencen_semana} href={route('memberships.index')} color="yellow" />
                </div>

                {/* Recordatorios de hoy */}
                <div className="lg:col-span-2">
                    <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide mb-3">
                        Recordatorios para hoy ({recordatorios_hoy.length})
                    </h2>

                    {recordatorios_hoy.length === 0 ? (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 text-center text-zinc-400 text-sm">
                            Sin recordatorios pendientes para hoy.
                        </div>
                    ) : (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                            <table className="min-w-full text-sm divide-y divide-zinc-100">
                                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Mascota / Dueño</th>
                                        <th className="px-4 py-3 text-left">Tipo</th>
                                        <th className="px-4 py-3 text-left">Teléfono</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {recordatorios_hoy.map((r, i) => (
                                        <tr key={i} className="hover:bg-zinc-50">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-zinc-800">{r.pet}</span>
                                                <span className="text-zinc-400 text-xs ml-1">/ {r.owner}</span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600">{r.tipo}</td>
                                            <td className="px-4 py-3 font-mono text-zinc-600">{r.telefono}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </TenantLayout>
    );
}
