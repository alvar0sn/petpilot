import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm } from '@inertiajs/react';
import BreedCombobox from '@/Components/BreedCombobox';

export default function PetEdit({ pet, razasCustom = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: pet.nombre ?? '',
        tipo: pet.tipo ?? 'perro',
        raza: pet.raza ?? '',
        tamanio: pet.tamanio ?? '',
        sexo: pet.sexo ?? '',
        esterilizado: !!pet.esterilizado,
        peso: pet.peso ?? '',
        nivel_agresividad: pet.nivel_agresividad ?? 'tranquilo',
        fecha_nacimiento: pet.fecha_nacimiento ?? '',
        alergias: pet.alergias ?? '',
        padecimientos: pet.padecimientos ?? '',
        obs_comportamiento: pet.obs_comportamiento ?? '',
        num_expediente: pet.num_expediente ?? '',
        estado: pet.estado ?? 'activo',
    });

    function submit(e) {
        e.preventDefault();
        put(route('pets.update', pet.id));
    }

    return (
        <TenantLayout title={`Editar — ${pet.nombre}`}>
            <div className="max-w-xl">
                <Link href={route('pets.show', pet.id)} className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 inline-block">
                    ← Volver a {pet.nombre}
                </Link>

                <form onSubmit={submit} className="bg-white border border-zinc-100 shadow-sm rounded-xl p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre *</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Especie *</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm" value={data.tipo} onChange={e => setData('tipo', e.target.value)}>
                                <option value="perro">Perro</option>
                                <option value="gato">Gato</option>
                                <option value="roedor">Roedor</option>
                                <option value="reptil">Reptil</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Tamaño</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm" value={data.tamanio} onChange={e => setData('tamanio', e.target.value)}>
                                <option value="">— seleccionar —</option>
                                <option value="pequeño">Pequeño</option>
                                <option value="mediano">Mediano</option>
                                <option value="grande">Grande</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Raza</label>
                            <BreedCombobox value={data.raza} onChange={v => setData('raza', v)} tipo={data.tipo} razasCustom={razasCustom} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Sexo</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm" value={data.sexo} onChange={e => setData('sexo', e.target.value)}>
                                <option value="">— seleccionar —</option>
                                <option value="macho">Macho</option>
                                <option value="hembra">Hembra</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Peso (kg)</label>
                            <input type="number" step="0.1" className="w-full border-gray-300 rounded-lg text-sm" value={data.peso} onChange={e => setData('peso', e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Nivel de agresividad *</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm" value={data.nivel_agresividad} onChange={e => setData('nivel_agresividad', e.target.value)}>
                                <option value="tranquilo">Tranquilo</option>
                                <option value="precaucion">Precaución</option>
                                <option value="agresivo">Agresivo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha de nacimiento</label>
                            <input type="date" className="w-full border-gray-300 rounded-lg text-sm" value={data.fecha_nacimiento} onChange={e => setData('fecha_nacimiento', e.target.value)} />
                        </div>

                        <div className="flex items-center gap-2 col-span-2">
                            <input type="checkbox" id="esterilizado" checked={data.esterilizado} onChange={e => setData('esterilizado', e.target.checked)} className="rounded border-gray-300 text-zinc-900" />
                            <label htmlFor="esterilizado" className="text-sm text-zinc-700">Esterilizado/a</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Estado</label>
                            <select className="w-full border-gray-300 rounded-lg text-sm" value={data.estado} onChange={e => setData('estado', e.target.value)}>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Número de expediente</label>
                            <input className="w-full border-gray-300 rounded-lg text-sm font-mono" value={data.num_expediente} onChange={e => setData('num_expediente', e.target.value)} />
                        </div>
                    </div>

                    <hr />

                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wide">Información médica</h3>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Alergias</label>
                            <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.alergias} onChange={e => setData('alergias', e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Padecimientos crónicos</label>
                            <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.padecimientos} onChange={e => setData('padecimientos', e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Observaciones de comportamiento</label>
                            <textarea rows={2} className="w-full border-gray-300 rounded-lg text-sm" value={data.obs_comportamiento} onChange={e => setData('obs_comportamiento', e.target.value)} />
                        </div>
                    </div>

                    <button type="submit" disabled={processing} className="w-full bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 text-sm font-medium transition-colors disabled:opacity-50">
                        {processing ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </form>
            </div>
        </TenantLayout>
    );
}
