import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatDate, formatDateTime, useTenantTimezone } from '@/lib/datetime';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function PosShift({ activeShift, recentShifts }) {
    const tz = useTenantTimezone();
    const openForm = useForm({ fondo_inicial: '' });
    const closeForm = useForm({ efectivo_contado: '' });
    const moveForm = useForm({ tipo: 'deposito', monto: '', comentario: '' });
    const [showMove, setShowMove] = useState(false);

    return (
        <TenantLayout title="Turno / Caja">
            {!activeShift ? (
                <div className="max-w-sm mx-auto mt-10 bg-white border border-zinc-100 shadow-sm rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-zinc-900 tracking-tight mb-4">Abrir turno</h2>
                    <form onSubmit={e => { e.preventDefault(); openForm.post(route('pos.shift.store')); }}>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Fondo inicial (efectivo en caja)</label>
                        <input
                            type="number" step="0.01"
                            className="w-full border-gray-300 rounded-lg text-sm mb-4"
                            value={openForm.data.fondo_inicial}
                            onChange={e => openForm.setData('fondo_inicial', e.target.value)}
                            placeholder="0.00"
                        />
                        <button type="submit" disabled={openForm.processing}
                            className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            Abrir turno
                        </button>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold text-emerald-800">Turno activo</h2>
                                <span className="text-xs text-emerald-600">
                                    Abierto {formatDateTime(activeShift.fecha_apertura, tz)}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-white border border-zinc-100 rounded-lg p-3 text-center">
                                    <p className="text-xs text-zinc-400">Fondo</p>
                                    <p className="font-bold text-zinc-800">{fmt(activeShift.fondo_inicial)}</p>
                                </div>
                                <div className="bg-white border border-zinc-100 rounded-lg p-3 text-center">
                                    <p className="text-xs text-zinc-400">Tickets cobrados</p>
                                    <p className="font-bold text-zinc-800">{activeShift.count_tickets}</p>
                                </div>
                                <div className="bg-white border border-zinc-100 rounded-lg p-3 text-center">
                                    <p className="text-xs text-zinc-400">Total cobrado</p>
                                    <p className="font-bold text-emerald-700">{fmt(activeShift.total_tickets)}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Link href={route('pos.index')}
                                    className="flex-1 text-center bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
                                    Ir al POS
                                </Link>
                                <button onClick={() => setShowMove(v => !v)}
                                    className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                                    Movimiento de caja
                                </button>
                            </div>
                        </div>

                        {showMove && (
                            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                                <h3 className="font-semibold text-zinc-700 mb-3">Movimiento de caja</h3>
                                <form onSubmit={e => {
                                    e.preventDefault();
                                    moveForm.post(route('pos.shift.movement', activeShift.id), { onSuccess: () => setShowMove(false) });
                                }} className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo</label>
                                            <select className="w-full border-gray-300 rounded-lg text-sm" value={moveForm.data.tipo} onChange={e => moveForm.setData('tipo', e.target.value)}>
                                                <option value="deposito">Depósito</option>
                                                <option value="salida">Salida</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-600 mb-1">Monto</label>
                                            <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm" value={moveForm.data.monto} onChange={e => moveForm.setData('monto', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Comentario</label>
                                        <input className="w-full border-gray-300 rounded-lg text-sm" value={moveForm.data.comentario} onChange={e => moveForm.setData('comentario', e.target.value)} />
                                    </div>
                                    <button type="submit" disabled={moveForm.processing}
                                        className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                                        Registrar
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeShift.cashMovements?.length > 0 && (
                            <div className="bg-white border border-zinc-100 shadow-sm rounded-xl overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-zinc-100">
                                    <h3 className="text-sm font-semibold text-zinc-700">Movimientos de caja</h3>
                                </div>
                                <table className="min-w-full text-sm">
                                    <tbody className="divide-y divide-zinc-50">
                                        {activeShift.cashMovements.map(m => (
                                            <tr key={m.id}>
                                                <td className="px-5 py-3.5">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${m.tipo === 'deposito' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'}`}>
                                                        {m.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 font-mono">{fmt(m.monto)}</td>
                                                <td className="px-5 py-3.5 text-zinc-500">{m.comentario}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5">
                            <h3 className="font-semibold text-zinc-700 mb-3">Cerrar turno</h3>
                            <form onSubmit={e => { e.preventDefault(); closeForm.post(route('pos.shift.close', activeShift.id)); }} className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-zinc-600 mb-1">Efectivo contado en caja</label>
                                    <input type="number" step="0.01" className="w-full border-gray-300 rounded-lg text-sm"
                                        value={closeForm.data.efectivo_contado} onChange={e => closeForm.setData('efectivo_contado', e.target.value)} placeholder="0.00" />
                                </div>
                                <button type="submit" disabled={closeForm.processing}
                                    className="self-end border border-red-300 text-red-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                                    Cerrar turno
                                </button>
                            </form>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Últimos turnos</h3>
                        <div className="space-y-2">
                            {recentShifts.map(s => (
                                <div key={s.id} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-3 text-sm">
                                    <div className="flex justify-between text-zinc-700">
                                        <span>{s.user}</span>
                                        <span className="font-mono">{fmt(s.total_tickets)}</span>
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5">
                                        {formatDate(s.fecha_apertura, tz)}
                                    </div>
                                </div>
                            ))}
                            {recentShifts.length === 0 && (
                                <p className="text-xs text-zinc-400">Sin turnos cerrados.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </TenantLayout>
    );
}
