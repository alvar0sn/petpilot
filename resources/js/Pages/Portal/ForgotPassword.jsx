import { useForm, usePage, Link } from '@inertiajs/react';

export default function PortalForgotPassword({ tenant }) {
    const { props } = usePage();
    const flash = props.flash ?? {};
    const form = useForm({ email: '' });

    function submit(e) {
        e.preventDefault();
        form.post(route('portal.forgot-password.post', tenant.slug));
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-zinc-900">{tenant.nombre}</h1>
                    <p className="text-zinc-500 text-sm mt-1">Portal de clientes</p>
                </div>

                {flash.status && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
                        {flash.status}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-zinc-800">Recuperar contraseña</h2>
                        <p className="text-xs text-zinc-500 mt-1">
                            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Correo electrónico</label>
                            <input type="email" autoComplete="email" autoFocus
                                className="w-full border-zinc-300 rounded-lg text-sm py-2"
                                value={form.data.email} onChange={e => form.setData('email', e.target.value)} />
                            {form.errors.email && <p className="text-red-500 text-xs mt-0.5">{form.errors.email}</p>}
                        </div>

                        <button type="submit" disabled={form.processing}
                            className="w-full bg-zinc-900 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                            {form.processing ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-zinc-400 mt-6">
                    <Link href={route('portal.login', tenant.slug)} className="text-zinc-600 hover:underline">
                        Volver al inicio de sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
