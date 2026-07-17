import { Link, usePage } from '@inertiajs/react';
import BacklogFab from '@/Components/BacklogFab';
import { useState } from 'react';

const NAV_LINKS = [
    { label: 'Tenants',         routeName: 'super-admin.index' },
    { label: 'Clientes',        routeName: 'super-admin.owners.index' },
    { label: 'Logs',            routeName: 'super-admin.logs' },
    { label: 'Backlog',         routeName: 'super-admin.backlog.index' },
    { label: 'Equipo',          routeName: 'super-admin.agency-users.index' },
    { label: 'Infraestructura', routeName: 'super-admin.system-settings.index' },
];

export default function SuperAdminLayout({ children, title }) {
    const { auth, impersonating, tenant } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <><div className="min-h-screen bg-gray-100">
            {impersonating && tenant && (
                <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium">
                    <span>👁 Estás viendo el panel de <strong>{tenant.nombre}</strong></span>
                    <Link
                        href={route('super-admin.impersonate.stop')}
                        method="post"
                        as="button"
                        className="bg-white text-amber-700 px-3 py-1 rounded text-xs font-bold hover:bg-amber-100"
                    >
                        Salir de impersonación
                    </Link>
                </div>
            )}

            <nav className="bg-zinc-900 text-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo */}
                        <Link href={route('super-admin.index')} className="text-base font-bold tracking-tight">
                            Petpilot <span className="text-zinc-400 text-xs font-normal">Super Admin</span>
                        </Link>

                        {/* Desktop links */}
                        <div className="hidden md:flex items-center gap-5">
                            {NAV_LINKS.map(l => (
                                <Link key={l.routeName} href={route(l.routeName)}
                                    className="text-sm text-zinc-300 hover:text-white transition-colors">
                                    {l.label}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop right */}
                        <div className="hidden md:flex items-center gap-3">
                            <span className="text-zinc-400 text-xs">{auth.user?.email}</span>
                            <Link href={route('logout')} method="post" as="button"
                                className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded transition-colors">
                                Salir
                            </Link>
                        </div>

                        {/* Hamburger */}
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            className="md:hidden p-2 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                            aria-label="Menú"
                        >
                            {menuOpen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden border-t border-zinc-800 bg-zinc-900">
                        <div className="px-4 py-3 space-y-1">
                            {NAV_LINKS.map(l => (
                                <Link key={l.routeName} href={route(l.routeName)}
                                    onClick={() => setMenuOpen(false)}
                                    className="block py-2 text-sm text-zinc-300 hover:text-white transition-colors">
                                    {l.label}
                                </Link>
                            ))}
                            <div className="border-t border-zinc-800 pt-3 mt-2 flex items-center justify-between">
                                <span className="text-zinc-500 text-xs">{auth.user?.email}</span>
                                <Link href={route('logout')} method="post" as="button"
                                    className="text-xs text-zinc-400 hover:text-white border border-zinc-700 px-2 py-1 rounded transition-colors">
                                    Salir
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
                {children}
            </main>
        </div>
        <BacklogFab /></>
    );
}
