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
        { key: 'home',         href: route('portal.dashboard', tenant.slug),    label: 'Inicio',      icon: 'ti-home-2' },
        { key: 'memberships',  href: route('portal.memberships', tenant.slug),  label: 'Membresías',  icon: 'ti-star' },
        { key: 'calendar',     href: route('portal.calendar', tenant.slug),     label: 'Calendario',  icon: 'ti-calendar' },
    ];

    return (
        <div className="min-h-screen bg-zinc-50">
            <header className="bg-white border-b border-zinc-100 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-zinc-700 truncate">{tenant.nombre}</span>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-zinc-500 hidden md:block">{owner.nombre}</span>
                        <button onClick={logout} disabled={processing}
                            className="text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors">
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-1">
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

            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-zinc-200 grid grid-cols-3">
                {nav.map(l => (
                    <Link key={l.key} href={l.href}
                        className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                            current === l.key ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                        }`}>
                        <i className={`ti ${l.icon}`} style={{ fontSize: '20px' }} />
                        <span className="text-[10px] font-medium">{l.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
