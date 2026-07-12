import { Link, useForm, usePage } from '@inertiajs/react';

const PET_ICONS = { perro: '🐕', gato: '🐈', otro: '🐾' };
const ESTADO_BADGE = {
    activo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    inactivo: 'bg-zinc-100 text-zinc-500',
    fallecido: 'bg-zinc-100 text-zinc-400 line-through',
};

export default function PortalDashboard({ tenant, owner, pets }) {
    const { props } = usePage();
    const flash = props.flash ?? {};
    const { post, processing } = useForm();

    function logout(e) {
        e.preventDefault();
        post(route('portal.logout', tenant.slug));
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-100">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-zinc-500">{tenant.nombre}</p>
                        <h1 className="text-base font-semibold text-zinc-900">
                            Hola, {owner.nombre}
                        </h1>
                    </div>
                    <button onClick={logout} disabled={processing}
                        className="text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors">
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {flash.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
                        {flash.success}
                    </div>
                )}

                {/* Mis mascotas */}
                <section>
                    <h2 className="text-sm font-semibold text-zinc-700 mb-3">Mis mascotas</h2>
                    {pets.length === 0 ? (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 text-center text-sm text-zinc-400">
                            Aún no tienes mascotas registradas. Contáctanos para agregarlas.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {pets.map(pet => (
                                <div key={pet.id}
                                    className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
                                    {pet.foto_url ? (
                                        <img src={pet.foto_url} alt={pet.nombre}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-2xl flex-shrink-0">
                                            {PET_ICONS[pet.tipo] ?? '🐾'}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-medium text-zinc-900 text-sm truncate">{pet.nombre}</p>
                                        {pet.raza && (
                                            <p className="text-xs text-zinc-500 truncate">{pet.raza}</p>
                                        )}
                                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${ESTADO_BADGE[pet.estado] ?? 'bg-zinc-100 text-zinc-500'}`}>
                                            {pet.estado}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Accesos rápidos */}
                <section>
                    <h2 className="text-sm font-semibold text-zinc-700 mb-3">Servicios</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Link href={route('portal.walks', tenant.slug)}
                            className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center gap-3 hover:border-zinc-300 transition-colors group">
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-xl">
                                🐕
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">Paseos</p>
                                <p className="text-xs text-zinc-500">Ver disponibilidad y reservar</p>
                            </div>
                        </Link>

                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-xl">
                                📋
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-800">Historial médico</p>
                                <p className="text-xs text-zinc-400">Próximamente</p>
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-xl">
                                ✂️
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-800">Grooming</p>
                                <p className="text-xs text-zinc-400">Próximamente</p>
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-xl">
                                🏨
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-800">Hotel / Guardería</p>
                                <p className="text-xs text-zinc-400">Próximamente</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
