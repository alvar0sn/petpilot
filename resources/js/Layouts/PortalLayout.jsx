import { Link, useForm, usePage } from '@inertiajs/react';

export default function PortalLayout({ tenant, owner, current, children }) {
    const { props } = usePage();
    const flash = props.flash ?? {};
    const { post, processing } = useForm();

    function logout(e) {
        e.preventDefault();
        post(route('portal.logout', tenant.slug));
    }

    const nav = [
        { key: 'home',         href: route('portal.dashboard', tenant.slug),    label: 'Inicio' },
        { key: 'memberships',  href: route('portal.memberships', tenant.slug),  label: 'Membresías' },
        { key: 'walks',        href: route('portal.walks', tenant.slug),         label: 'Paseos' },
    ];

    return (
        <div className="min-h-screen bg-zinc-50">
            <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <span className="text-xs text-zinc-400 hidden sm:block shrink-0">{tenant.nombre}</span>
                        <nav className="flex gap-0.5">
                            {nav.map(l => (
                                <Link key={l.key} href={l.href}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                        current === l.key
                                            ? 'bg-zinc-900 text-white'
                                            : 'text-zinc-600 hover:bg-zinc-100'
                                    }`}>
                                    {l.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-500 hidden md:block">{owner.nombre}</span>
                        <button onClick={logout} disabled={processing}
                            className="text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors">
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 space-y-1">
                {flash.success && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
                        {flash.success}
                    </div>
                )}
                {flash.error && (
                    <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">
                        {flash.error}
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
