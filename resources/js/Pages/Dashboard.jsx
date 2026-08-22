import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function MetricCard({ label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-zinc-100 text-zinc-700',
        green:  'bg-green-50 text-green-700',
        blue:   'bg-sky-50 text-sky-700',
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
    const colors = {
        yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800',
        red:    'border-red-300 bg-red-50 text-red-800',
    };
    return (
        <div className={`border rounded-lg p-3 flex items-center justify-between ${colors[color]}`}>
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold">{count}</p>
            </div>
            {href && <Link href={href} className="text-xs underline opacity-70 hover:opacity-100">Ver →</Link>}
        </div>
    );
}

const TIPO_COLOR = {
    'Estética':        'bg-violet-100 text-violet-700',
    'Vacuna':          'bg-sky-100 text-sky-700',
    'Desparasitación': 'bg-orange-100 text-orange-700',
    'Consulta':        'bg-teal-100 text-teal-700',
};

function daysFromToday(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function DaysLabel({ dateStr }) {
    const days = daysFromToday(dateStr);
    if (days === 0) return <span className="text-amber-600 font-semibold text-xs">Hoy</span>;
    if (days < 0)  return <span className="text-red-600 text-xs">Hace {Math.abs(days)} día{Math.abs(days) !== 1 ? 's' : ''}</span>;
    return <span className="text-emerald-600 text-xs">En {days} día{days !== 1 ? 's' : ''}</span>;
}

const periods = [
    { value: 'week',    label: 'Esta semana' },
    { value: 'month',   label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
];

const FILTROS = [
    { key: 'hoy',   label: 'Hoy',     days: 0 },
    { key: '3dias', label: '± 3 días', days: 3 },
    { key: '7dias', label: '± 7 días', days: 7 },
];

export default function Dashboard({ period, from, to, metricas, alertas, recordatorios }) {
    const [filtro, setFiltro] = useState('hoy');
    const [sendingKey, setSendingKey] = useState(null);

    function sendRecordatorio(r, key) {
        setSendingKey(key);
        router.post(route('dashboard.recordatorios.send'), {
            source: r.source,
            event_id: r.event_id,
            pet_id: r.pet_id,
            tipo: r.tipo,
            fecha: r.fecha,
        }, {
            preserveScroll: true,
            onFinish: () => setSendingKey(null),
        });
    }

    function changePeriod(p) {
        router.get(route('dashboard'), { period: p }, { preserveState: false });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDays = FILTROS.find(f => f.key === filtro)?.days ?? 0;
    const filtered = (recordatorios ?? []).filter(r => {
        const d = Math.abs(daysFromToday(r.fecha));
        return d <= maxDays;
    });

    // Para "Hoy" también incluir los negativos de 0 días (mismo día)
    const filteredFinal = filtro === 'hoy'
        ? (recordatorios ?? []).filter(r => daysFromToday(r.fecha) === 0)
        : filtered;

    const hasAlertas = alertas.sin_mascota + alertas.membresias_saldo_bajo + alertas.membresias_vencen_semana > 0;

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
                    {!hasAlertas ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">
                            Sin alertas pendientes ✓
                        </div>
                    ) : (
                        <>
                            <AlertCard label="Clientes sin mascota" count={alertas.sin_mascota} href={route('owners.index')} color="yellow" />
                            <AlertCard label="Membresías con saldo bajo" count={alertas.membresias_saldo_bajo} href={route('memberships.index')} color="red" />
                            <AlertCard label="Membresías vencen esta semana" count={alertas.membresias_vencen_semana} href={route('memberships.index')} color="yellow" />
                        </>
                    )}
                </div>

                {/* Recordatorios */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wide">Recordatorios</h2>
                        <div className="flex gap-1">
                            {FILTROS.map(f => (
                                <button key={f.key} onClick={() => setFiltro(f.key)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                                        filtro === f.key
                                            ? 'bg-zinc-900 text-white border-zinc-900'
                                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredFinal.length === 0 ? (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 text-center text-zinc-400 text-sm">
                            Sin recordatorios para este rango.
                        </div>
                    ) : (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                            <div className="max-h-[420px] overflow-y-auto">
                            <table className="min-w-full text-sm divide-y divide-zinc-100">
                                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Mascota / Dueño</th>
                                        <th className="px-4 py-3 text-left">Tipo</th>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Teléfono</th>
                                        <th className="px-4 py-3 text-left">Recordatorio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {filteredFinal.map((r, i) => {
                                        const key = `${r.source}-${r.event_id ?? r.pet_id}-${r.tipo}-${r.fecha}`;
                                        return (
                                        <tr key={key} className="hover:bg-zinc-50">
                                            <td className="px-4 py-3">
                                                {r.pet_id ? (
                                                    <Link href={route('pets.show', r.pet_id)}
                                                        className="font-medium text-zinc-800 hover:underline">
                                                        {r.pet}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium text-zinc-800">{r.pet}</span>
                                                )}
                                                {r.owner && (
                                                    <div className="text-xs text-zinc-400">
                                                        {r.owner_id ? (
                                                            <Link href={route('owners.show', r.owner_id)} className="hover:underline">
                                                                {r.owner}
                                                            </Link>
                                                        ) : r.owner}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[r.tipo] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                                    {r.tipo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-zinc-500">{r.fecha}</div>
                                                <DaysLabel dateStr={r.fecha} />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-zinc-600 text-xs">{r.telefono}</td>
                                            <td className="px-4 py-3">
                                                {r.enviado ? (
                                                    <span className="text-xs font-medium text-emerald-600">✓ Enviado</span>
                                                ) : (
                                                    <button type="button" onClick={() => sendRecordatorio(r, key)}
                                                        disabled={sendingKey === key}
                                                        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors">
                                                        {sendingKey === key ? 'Enviando…' : 'Enviar'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TenantLayout>
    );
}
