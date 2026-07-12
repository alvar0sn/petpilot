import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import { formatDate, useTenantTimezone } from '@/lib/datetime';

const PET_ICONS = { perro: '🐕', gato: '🐈', roedor: '🐹', reptil: '🦎', otro: '🐾' };

const RECORDATORIO_LABELS = {
    recordatorio_vacuna:   { label: 'Vacuna',          icon: '💉' },
    recordatorio_despa:    { label: 'Desparasitación', icon: '🐛' },
    recordatorio_consulta: { label: 'Consulta',        icon: '🩺' },
    recordatorio_estetica: { label: 'Estética',        icon: '✂️' },
};

const MODULO_LABEL = { grooming: 'Grooming', veterinaria: 'Veterinaria' };
const MODULO_COLOR = { grooming: 'bg-violet-50 text-violet-700', veterinaria: 'bg-teal-50 text-teal-700' };

function daysFrom(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function RecordatorioBadge({ days, dateStr, tz }) {
    const cls = days < 0
        ? 'bg-rose-50 border-rose-200 text-rose-700'
        : days <= 7  ? 'bg-amber-50 border-amber-200 text-amber-700'
        : days <= 30 ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700';
    const label = days < 0
        ? `Venció hace ${Math.abs(days)}d`
        : days === 0 ? 'Hoy'
        : `En ${days}d`;
    return (
        <div className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${cls}`}>
            <span>{formatDate(dateStr, tz)}</span>
            <span className="font-medium">{label}</span>
        </div>
    );
}

export default function PortalHome({ tenant, owner, pets, appointments, walkBookings }) {
    const tz = useTenantTimezone();

    // Aggregate recordatorios across all pets, filter non-null, sort by urgency
    const recordatorios = pets.flatMap(pet =>
        Object.entries(RECORDATORIO_LABELS)
            .filter(([key]) => pet[key])
            .map(([key, { label, icon }]) => ({
                petId: pet.id,
                petNombre: pet.nombre,
                key,
                label,
                icon,
                dateStr: pet[key],
                days: daysFrom(pet[key]),
            }))
    )
    .filter(r => r.days !== null && r.days <= 60)
    .sort((a, b) => a.days - b.days);

    // Merge appointments + walk bookings into a single upcoming list
    const visitas = [
        ...appointments.map(a => ({ ...a, _kind: 'appointment' })),
        ...walkBookings.map(b => ({ ...b, _kind: 'walk', tipo_servicio: 'Paseo', modulo: 'paseos' })),
    ].sort((a, b) => {
        const dateA = a.fecha + (a.hora_inicio ?? '00:00');
        const dateB = b.fecha + (b.hora_inicio ?? '00:00');
        return dateA.localeCompare(dateB);
    });

    return (
        <PortalLayout tenant={tenant} owner={owner} current="home">
            {/* Mascotas */}
            <section>
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Mis mascotas</h2>
                {pets.length === 0 ? (
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 text-center text-sm text-zinc-400">
                        Aún no tienes mascotas registradas.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {pets.map(pet => (
                            <Link key={pet.id}
                                href={route('portal.pet.history', { tenant: tenant.slug, pet: pet.id })}
                                className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex flex-col items-center gap-2 hover:border-zinc-300 transition-colors group text-center">
                                {pet.foto_url ? (
                                    <img src={pet.foto_url} alt={pet.nombre}
                                        className="w-16 h-16 rounded-full object-cover border border-zinc-100" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-3xl">
                                        {PET_ICONS[pet.tipo] ?? '🐾'}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-zinc-900 text-sm group-hover:underline">{pet.nombre}</p>
                                    {pet.raza && <p className="text-xs text-zinc-400 truncate">{pet.raza}</p>}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Recordatorios */}
            {recordatorios.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Recordatorios</h2>
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl divide-y divide-zinc-50">
                        {recordatorios.map((r, i) => (
                            <div key={i} className="px-4 py-3 flex items-center gap-3">
                                <span className="text-xl w-7 text-center flex-shrink-0">{r.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-800">{r.label}</p>
                                    <p className="text-xs text-zinc-400">{r.petNombre}</p>
                                </div>
                                <div className="shrink-0">
                                    <RecordatorioBadge days={r.days} dateStr={r.dateStr} tz={tz} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Próximas visitas */}
            <section className="mt-6">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Próximas visitas</h2>
                {visitas.length === 0 ? (
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 text-center text-sm text-zinc-400">
                        Sin visitas programadas en los próximos 30 días.
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl divide-y divide-zinc-50">
                        {visitas.map((v, i) => (
                            <div key={i} className="px-4 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODULO_COLOR[v.modulo] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                            {v.tipo_servicio ?? MODULO_LABEL[v.modulo] ?? v.modulo}
                                        </span>
                                        <span className="text-sm text-zinc-700">{v.pet}</span>
                                    </div>
                                    {v.estado === 'solicitado' && (
                                        <p className="text-xs text-amber-600 mt-0.5">Pendiente de confirmar</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-medium text-zinc-800">
                                        {v.fecha ? formatDate(v.fecha, tz, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                                    </p>
                                    {v.hora_inicio && (
                                        <p className="text-xs text-zinc-400">{String(v.hora_inicio).slice(0, 5)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </PortalLayout>
    );
}
