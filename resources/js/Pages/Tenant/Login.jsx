import { useForm, Link } from '@inertiajs/react';

export default function TenantLogin({ tenant, status }) {
    const form = useForm({ email: '', password: '', remember: false });
    const color = tenant.primary_color ?? '#18181b';

    function submit(e) {
        e.preventDefault();
        form.post(route('tenant.login.post', tenant.slug), {
            onFinish: () => form.reset('password'),
        });
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    {tenant.logo ? (
                        <img src={tenant.logo} alt={tenant.nombre}
                             className="h-16 w-auto object-contain mx-auto mb-4" />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4"
                             style={{ background: color }}>
                            {tenant.nombre.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-zinc-900">{tenant.nombre}</h1>
                    <p className="text-zinc-500 text-sm mt-1">Acceso para personal</p>
                </div>

                {status && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
                        {status}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Correo electrónico</label>
                            <input type="email" autoComplete="email" autoFocus
                                className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                value={form.data.email}
                                onChange={e => form.setData('email', e.target.value)} />
                            {form.errors.email && <p className="text-red-500 text-xs mt-0.5">{form.errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Contraseña</label>
                            <input type="password" autoComplete="current-password"
                                className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                value={form.data.password}
                                onChange={e => form.setData('password', e.target.value)} />
                            {form.errors.password && <p className="text-red-500 text-xs mt-0.5">{form.errors.password}</p>}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                            <input type="checkbox" className="rounded border-zinc-300"
                                checked={form.data.remember}
                                onChange={e => form.setData('remember', e.target.checked)} />
                            Recordarme
                        </label>
                        <button type="submit" disabled={form.processing}
                            className="w-full text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
                            style={{ background: color }}>
                            {form.processing ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-zinc-400 mt-6">
                    ¿Eres cliente?{' '}
                    <Link href={route('portal.login', tenant.slug)} className="underline hover:text-zinc-600">
                        Accede al portal
                    </Link>
                </p>
            </div>
        </div>
    );
}
