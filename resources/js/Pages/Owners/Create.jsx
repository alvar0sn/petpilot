import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';

export default function OwnersCreate() {
    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        apellidos: '',
        telefono: '',
        email: '',
        direccion: '',
        notas: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('owners.store'));
    }

    return (
        <TenantLayout title="Nuevo cliente">
            <div className="max-w-xl">
                <Link href={route('owners.index')} className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 inline-block">
                    ← Volver a clientes
                </Link>

                <form onSubmit={submit} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre *</label>
                            <input
                                className="w-full border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
                                value={data.nombre}
                                onChange={e => setData('nombre', e.target.value)}
                                autoFocus
                            />
                            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Apellidos</label>
                            <input
                                className="w-full border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
                                value={data.apellidos}
                                onChange={e => setData('apellidos', e.target.value)}
                            />
                            {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono *</label>
                        <input
                            className="w-full border-gray-300 rounded-lg text-sm font-mono"
                            value={data.telefono}
                            onChange={e => setData('telefono', e.target.value)}
                            placeholder="10 dígitos"
                        />
                        {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Dirección</label>
                        <input
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={data.direccion}
                            onChange={e => setData('direccion', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Notas internas</label>
                        <textarea
                            rows={3}
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={data.notas}
                            onChange={e => setData('notas', e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {processing ? 'Guardando...' : 'Crear cliente'}
                    </button>
                </form>
            </div>
        </TenantLayout>
    );
}
