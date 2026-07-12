import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { useForm } from '@inertiajs/react';

export default function TenantCreate() {
    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        slug: '',
        estado: 'trial',
        plan_precio: '',
        admin_nombre: '',
        admin_apellido: '',
        admin_email: '',
        admin_password: '',
        ghl_api_key: '',
        ghl_location_id: '',
        notas_internas: '',
    });

    function autoSlug(nombre) {
        const slug = nombre.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        setData(d => ({ ...d, nombre, slug }));
    }

    function submit(e) {
        e.preventDefault();
        post(route('super-admin.tenants.store'));
    }

    return (
        <SuperAdminLayout title="Nuevo Tenant">
            <form onSubmit={submit} className="space-y-8 max-w-2xl">

                <section className="bg-white rounded-xl shadow p-6 space-y-4">
                    <h2 className="font-semibold text-gray-900">Datos del negocio</h2>

                    <div>
                        <InputLabel value="Nombre del negocio" />
                        <TextInput className="mt-1 w-full" value={data.nombre}
                            onChange={e => autoSlug(e.target.value)} required />
                        <InputError message={errors.nombre} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel value="Slug (subdominio)" />
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                value={data.slug}
                                onChange={e => setData('slug', e.target.value)}
                                required pattern="[a-z0-9-]+"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                .vetrkt.com
                            </span>
                        </div>
                        <InputError message={errors.slug} className="mt-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Estado" />
                            <select className="mt-1 w-full border-gray-300 rounded-md text-sm"
                                value={data.estado} onChange={e => setData('estado', e.target.value)}>
                                <option value="trial">Trial</option>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                        <div>
                            <InputLabel value="Plan / precio" />
                            <TextInput className="mt-1 w-full" value={data.plan_precio}
                                onChange={e => setData('plan_precio', e.target.value)}
                                placeholder="ej. $1,500 MXN/mes" />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Notas internas" />
                        <textarea className="mt-1 w-full border-gray-300 rounded-md text-sm"
                            rows={3} value={data.notas_internas}
                            onChange={e => setData('notas_internas', e.target.value)} />
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow p-6 space-y-4">
                    <h2 className="font-semibold text-gray-900">Admin del tenant</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Nombre" />
                            <TextInput className="mt-1 w-full" value={data.admin_nombre}
                                onChange={e => setData('admin_nombre', e.target.value)} required />
                            <InputError message={errors.admin_nombre} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel value="Apellido" />
                            <TextInput className="mt-1 w-full" value={data.admin_apellido}
                                onChange={e => setData('admin_apellido', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Email" />
                        <TextInput type="email" className="mt-1 w-full" value={data.admin_email}
                            onChange={e => setData('admin_email', e.target.value)} required />
                        <InputError message={errors.admin_email} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel value="Contraseña temporal" />
                        <TextInput type="password" className="mt-1 w-full" value={data.admin_password}
                            onChange={e => setData('admin_password', e.target.value)} required />
                        <InputError message={errors.admin_password} className="mt-1" />
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow p-6 space-y-4">
                    <h2 className="font-semibold text-gray-900">GoHighLevel (opcional)</h2>

                    <div>
                        <InputLabel value="API Key" />
                        <TextInput className="mt-1 w-full font-mono text-xs" value={data.ghl_api_key}
                            onChange={e => setData('ghl_api_key', e.target.value)}
                            placeholder="eyJ..." />
                    </div>

                    <div>
                        <InputLabel value="Location ID" />
                        <TextInput className="mt-1 w-full font-mono text-xs" value={data.ghl_location_id}
                            onChange={e => setData('ghl_location_id', e.target.value)} />
                    </div>
                </section>

                <div className="flex justify-end">
                    <PrimaryButton disabled={processing}>
                        {processing ? 'Creando...' : 'Crear Tenant'}
                    </PrimaryButton>
                </div>
            </form>
        </SuperAdminLayout>
    );
}
