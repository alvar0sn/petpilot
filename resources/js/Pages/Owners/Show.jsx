import TenantLayout from '@/Layouts/TenantLayout';
import { Link, router } from '@inertiajs/react';

const agresividad = {
    tranquilo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    precaucion: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    agresivo: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
};

const tipoBadge = { perro: '🐶', gato: '🐱', roedor: '🐭', reptil: '🦎', otro: '🐾' };

const syncLabel = {
    synced: 'Sincronizado',
    pending: 'Pendiente',
    failed: 'Error',
};

export default function OwnerShow({ owner }) {
    function handleSyncContact() {
        router.post(route('owners.sync-ghl', owner.id));
    }

    function handleDelete() {
        if (confirm(`¿Eliminar a ${owner.nombre_completo}? Esta acción es irreversible.`)) {
            router.delete(route('owners.destroy', owner.id));
        }
    }

    return (
        <TenantLayout title={owner.nombre_completo}>
            <div className="mb-4 flex items-center justify-between">
                <Link href={route('owners.index')} className="text-sm text-zinc-500 hover:text-zinc-700">
                    ← Clientes
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={handleSyncContact}
                        className="text-xs bg-white border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-50 font-medium transition-colors"
                    >
                        Resincronizar contacto
                    </button>
                    <Link href={route('owners.edit', owner.id)}
                        className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                        Editar
                    </Link>
                    <button onClick={handleDelete}
                        className="text-xs border border-red-300 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                        Eliminar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Info del cliente */}
                <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                    <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">{owner.nombre_completo}</h2>
                    <div className="text-sm space-y-2 text-zinc-600">
                        <div className="flex gap-2">
                            <span className="text-zinc-400 w-20">Teléfono</span>
                            <span className="font-mono">{owner.telefono}</span>
                        </div>
                        {owner.email && (
                            <div className="flex gap-2">
                                <span className="text-zinc-400 w-20">Email</span>
                                <span>{owner.email}</span>
                            </div>
                        )}
                        {owner.direccion && (
                            <div className="flex gap-2">
                                <span className="text-zinc-400 w-20">Dirección</span>
                                <span>{owner.direccion}</span>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <span className="text-zinc-400 w-20">Sincronización</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center ${
                                owner.ghl_sync_status === 'synced' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : owner.ghl_sync_status === 'failed' ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            }`}>
                                {syncLabel[owner.ghl_sync_status] ?? owner.ghl_sync_status}
                            </span>
                        </div>
                    </div>
                    {owner.notas && (
                        <div className="pt-2 border-t">
                            <p className="text-xs text-zinc-400 mb-1">Notas</p>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{owner.notas}</p>
                        </div>
                    )}
                </div>

                {/* Mascotas */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
                            Mascotas ({owner.pets.length})
                        </h3>
                        <Link href={route('pets.create', owner.id)}
                            className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                            + Agregar mascota
                        </Link>
                    </div>

                    {owner.pets.length === 0 && (
                        <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-8 text-center text-zinc-400 text-sm">
                            Sin mascotas registradas.
                        </div>
                    )}

                    <div className="grid gap-3">
                        {owner.pets.map(pet => (
                            <Link key={pet.id} href={route('pets.show', pet.id)}
                                className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                                <span className="text-3xl">{tipoBadge[pet.tipo] ?? '🐾'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-zinc-900">{pet.nombre}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center ${agresividad[pet.nivel_agresividad]}`}>
                                            {pet.nivel_agresividad}
                                        </span>
                                        {pet.estado === 'inactivo' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 inline-flex items-center">inactivo</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                        {pet.raza && <span>{pet.raza} · </span>}
                                        {pet.tipo}
                                        {pet.tamanio && <span> · {pet.tamanio}</span>}
                                        {pet.peso && <span> · {pet.peso}kg</span>}
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-400">
                                    {pet.events_count ?? 0} eventos →
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </TenantLayout>
    );
}
