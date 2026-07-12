import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { dateKeyInTimezone, formatDate, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const servicioLabel = { guarderia: 'Guardería', hotel: 'Hotel', estetica: 'Estética', paseo: 'Paseo' };
const servicioColor = { guarderia: 'bg-blue-100 text-blue-700', hotel: 'bg-purple-100 text-purple-700', estetica: 'bg-pink-100 text-pink-700', paseo: 'bg-green-100 text-green-700' };

function CreditChip({ credit }) {
    const low = credit.saldo_actual <= 2;

    return (
        <span className={`inline-block whitespace-nowrap text-xs px-1.5 py-0.5 rounded-full font-medium ${low ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' : servicioColor[credit.servicio_tipo]}`}>
            {servicioLabel[credit.servicio_tipo]} {credit.saldo_actual}/{credit.saldo_inicial}
        </span>
    );
}

function AssignModal({ plans, onClose }) {
    const { version } = usePage();
    const tz = useTenantTimezone();
    const [petSearch, setPetSearch] = useState('');
    const [petResults, setPetResults] = useState([]);
    const [selectedPet, setSelectedPet] = useState(null);
    const form = useForm({ pet_id: '', plan_id: plans[0]?.id ?? '', fecha_inicio: dateKeyInTimezone(new Date(), tz) });

    async function searchPet(q) {
        setPetSearch(q);
        if (q.length < 2) { setPetResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: q }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        const owners = r.data?.props?.owners?.data ?? [];
        const pets = owners.flatMap(o => (o.pets ?? []).map(p => ({ id: p.id, nombre: p.nombre, owner: o.nombre_completo })));
        setPetResults(pets.slice(0, 8));
    }

    const plan = plans.find(p => p.id == form.data.plan_id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
                <h3 className="font-semibold text-zinc-800">Asignar membresía</h3>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Mascota</label>
                    <div className="relative">
                        <input className="w-full border-gray-300 rounded-lg text-sm" placeholder="Buscar mascota..." value={selectedPet ? selectedPet.nombre : petSearch} onChange={e => { setSelectedPet(null); searchPet(e.target.value); }} />
                        {petResults.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {petResults.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedPet(p); form.setData('pet_id', p.id); setPetResults([]); }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">
                                        <span className="font-medium">{p.nombre}</span>
                                        <span className="text-zinc-400 ml-2">{p.owner}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Plan</label>
                    <select className="w-full border-gray-300 rounded-lg text-sm" value={form.data.plan_id} onChange={e => form.setData('plan_id', e.target.value)}>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.precio)} / {p.vigencia_dias} días</option>)}
                    </select>
                    {plan && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {plan.plan_credits?.map(c => (
                                <span key={c.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${servicioColor[c.servicio_tipo]}`}>
                                    {c.creditos} {servicioLabel[c.servicio_tipo]}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Fecha de inicio</label>
                    <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={form.data.fecha_inicio} onChange={e => form.setData('fecha_inicio', e.target.value)} />
                </div>

                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">Cancelar</button>
                    <button onClick={() => form.post(route('memberships.assign'), { onSuccess: onClose })}
                        disabled={!form.data.pet_id || form.processing}
                        className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40">
                        {form.processing ? 'Asignando...' : 'Asignar membresía'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MembershipsIndex({ memberships, plans, filters }) {
    const tz = useTenantTimezone();
    const [showAssign, setShowAssign] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');

    function updateFilters(overrides) {
        router.get(route('memberships.index'), {
            search: filters.search ?? '',
            plan_id: filters.plan_id ?? '',
            vence_pronto: filters.vence_pronto ?? '',
            ...overrides,
        }, { preserveState: true, replace: true });
    }

    function doSearch(e) {
        e.preventDefault();
        updateFilters({ search });
    }

    return (
        <TenantLayout title="Membresías">
            <div className="flex justify-between mb-5">
                <div className="flex gap-2">
                    <Link href={route('memberships.plans')} className="bg-white border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium transition-colors">
                        Planes →
                    </Link>
                </div>
                <button onClick={() => setShowAssign(true)} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                    + Asignar membresía
                </button>
            </div>

            {/* Filtros rápidos */}
            <div className="flex flex-col lg:flex-row gap-3 mb-4">
                <form onSubmit={doSearch} className="flex gap-2 flex-1">
                    <input
                        className="flex-1 border-gray-300 rounded-lg text-sm"
                        placeholder="Buscar por nombre, celular o mascota..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">Buscar</button>
                </form>

                <select
                    className="border-gray-300 rounded-lg text-sm"
                    value={filters.plan_id ?? ''}
                    onChange={e => updateFilters({ plan_id: e.target.value })}
                >
                    <option value="">Todos los planes</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>

                <button
                    onClick={() => updateFilters({ vence_pronto: filters.vence_pronto ? '' : '1' })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${filters.vence_pronto ? 'bg-amber-500 text-white border-amber-500' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                >
                    ⏰ Vence en 7 días
                </button>
            </div>

            {showAssign && <AssignModal plans={plans} onClose={() => setShowAssign(false)} />}

            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        <tr>
                            <th className="px-4 py-3 text-left">Mascota / Dueño</th>
                            <th className="px-4 py-3 text-left">Plan</th>
                            <th className="px-4 py-3 text-left">Créditos</th>
                            <th className="px-4 py-3 text-left">Vence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {memberships.data.map(m => {
                            const lowCredit = m.credits.some(c => c.saldo_actual <= 2);
                            return (
                                <tr key={m.id} onClick={() => router.visit(route('memberships.show', m.id))} className="hover:bg-zinc-50 cursor-pointer">
                                    <td className="px-4 py-3">
                                        <Link href={route('memberships.show', m.id)} onClick={e => e.stopPropagation()} className="font-medium text-zinc-900 hover:text-zinc-700 hover:underline">
                                            {m.pet}
                                        </Link>
                                        {m.congelada && (
                                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-200">Congelada</span>
                                        )}
                                        <div className="text-xs text-zinc-400">{m.owner}</div>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-600">{m.plan}</td>
                                    <td className="px-4 py-3 max-w-[13rem]">
                                        <div className="flex flex-wrap gap-1">
                                            {m.credits.map(c => <CreditChip key={c.servicio_tipo} credit={c} />)}
                                        </div>
                                        {lowCredit && (
                                            <p className="text-xs text-red-500 mt-1">Saldo bajo</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={m.dias_para_vencer <= 7 ? 'text-red-600 font-medium' : 'text-zinc-600'}>
                                            {formatDate(m.fecha_vencimiento, tz, { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                        </span>
                                        {m.dias_para_vencer <= 7 && (
                                            <div className="text-xs text-red-400">{m.dias_para_vencer} días</div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {memberships.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">Sin membresías activas.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </TenantLayout>
    );
}
