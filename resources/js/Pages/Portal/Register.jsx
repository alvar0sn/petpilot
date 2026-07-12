import { useForm, Link } from '@inertiajs/react';

export default function PortalRegister({ tenant }) {
    const form = useForm({
        nombre: '',
        apellidos: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function submit(e) {
        e.preventDefault();
        form.post(route('portal.register.post', tenant.slug));
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-zinc-900">{tenant.nombre}</h1>
                    <p className="text-zinc-500 text-sm mt-1">Portal de clientes</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-zinc-800">Crear cuenta</h2>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre</label>
                                <input type="text" autoFocus
                                    className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                    value={form.data.nombre} onChange={e => form.setData('nombre', e.target.value)} />
                                {form.errors.nombre && <p className="text-red-500 text-xs mt-0.5">{form.errors.nombre}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1">Apellidos</label>
                                <input type="text"
                                    className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                    value={form.data.apellidos} onChange={e => form.setData('apellidos', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Correo electrónico</label>
                            <input type="email" autoComplete="email"
                                className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                value={form.data.email} onChange={e => form.setData('email', e.target.value)} />
                            {form.errors.email && <p className="text-red-500 text-xs mt-0.5">{form.errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Contraseña</label>
                            <input type="password" autoComplete="new-password"
                                className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                value={form.data.password} onChange={e => form.setData('password', e.target.value)} />
                            {form.errors.password && <p className="text-red-500 text-xs mt-0.5">{form.errors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Confirmar contraseña</label>
                            <input type="password" autoComplete="new-password"
                                className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                value={form.data.password_confirmation} onChange={e => form.setData('password_confirmation', e.target.value)} />
                        </div>

                        <button type="submit" disabled={form.processing}
                            className="w-full bg-zinc-900 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                            {form.processing ? 'Creando cuenta...' : 'Crear cuenta'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-zinc-400 mt-6">
                    ¿Ya tienes cuenta?{' '}
                    <Link href={route('portal.login', tenant.slug)} className="text-zinc-600 hover:underline">
                        Iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
