import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import BacklogFab from '@/Components/BacklogFab';

const nav = [
    { label: 'Dashboard',       href: 'dashboard',          icon: 'ti-layout-dashboard', module: null },
    { label: 'Clientes',        href: 'owners.index',       icon: 'ti-users',            module: 'crm' },
    { label: 'Grooming',        href: 'grooming.index',     icon: 'ti-scissors',         module: 'grooming' },
    { label: 'Veterinaria',     href: 'vet.index',          icon: 'ti-stethoscope',      module: 'veterinaria' },
    { label: 'Hotel',           href: 'hotel.index',        icon: 'ti-building',         module: 'hotel' },
    { label: 'Membresías',      href: 'memberships.index',  icon: 'ti-star',             module: 'memberships' },
    { label: 'Paseos',          href: 'walks.index',        icon: 'ti-dog',              module: 'paseos', badge: 'walks_pending_count' },
    { label: 'POS',             href: 'pos.index',          icon: 'ti-shopping-cart',    module: 'pos' },
    { label: 'Landing',         href: 'landing.editor',     icon: 'ti-world',            module: null },
    { label: 'Configuración',   href: 'settings.index',     icon: 'ti-settings',         module: null },
];

export default function TenantLayout({ children, title, noPadding = false }) {
    const { auth, tenant, impersonating, flash, walks_pending_count } = usePage().props;
    const badgeCounts = { walks_pending_count };
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const currentRoute = route().current();

    const permisos = auth.user?.permisos_modulos;
    const isAdmin  = auth.user?.role === 'tenant_admin';
    const hasModule = (mod) => {
        if (!mod || isAdmin) return true;
        if (!permisos || permisos.length === 0) return true;
        return permisos.includes(mod);
    };
    const visibleNav = nav.filter(item => hasModule(item.module));

    return (
        <>
            <div className="min-h-screen bg-zinc-50 flex">
                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-zinc-950 flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="px-4 py-4 border-b border-zinc-800">
                        <span className="text-base font-semibold tracking-tight text-zinc-100">Petpilot</span>
                        {tenant && <p className="text-zinc-500 text-xs mt-0.5 truncate">{tenant.nombre}</p>}
                    </div>

                    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                        {visibleNav.map(item => {
                            const active = item.href && currentRoute?.startsWith(item.href.split('.')[0]);
                            const badge = item.badge ? (badgeCounts[item.badge] || 0) : 0;
                            return (
                                <Link
                                    key={item.href}
                                    href={route(item.href)}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900'}`}
                                    style={{ fontSize: '13px' }}
                                >
                                    <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} />
                                    <span className="flex-1">{item.label}</span>
                                    {badge > 0 && (
                                        <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                                            {badge > 9 ? '9+' : badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="px-4 py-3 border-t border-zinc-800">
                        <p className="text-xs text-zinc-400 truncate mb-1">{auth.user?.nombre} {auth.user?.apellido}</p>
                        <Link href={tenant?.slug ? route('tenant.logout', tenant.slug) : route('logout')} method="post" as="button"
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-100 transition-colors text-xs">
                            <i className="ti ti-logout" style={{ fontSize: '13px' }} />
                            Cerrar sesión
                        </Link>
                    </div>
                </aside>

                {sidebarOpen && (
                    <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Main */}
                <div className="flex-1 flex flex-col min-w-0">
                    {impersonating && tenant && (
                        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-30">
                            <span>Viendo <strong>{tenant.nombre}</strong> como super admin</span>
                            <Link href={route('super-admin.impersonate.stop')} method="delete" as="button"
                                className="bg-white text-amber-700 px-3 py-1 rounded-md text-xs font-semibold hover:bg-amber-50 transition-colors">
                                Salir
                            </Link>
                        </div>
                    )}

                    <header className="bg-white border-b border-zinc-200 px-6 py-3.5 flex items-center gap-4">
                        <button className="lg:hidden text-zinc-400 hover:text-zinc-700 transition-colors" onClick={() => setSidebarOpen(true)}>
                            <i className="ti ti-menu-2" style={{ fontSize: '20px' }} />
                        </button>
                        {title && <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{title}</h1>}
                    </header>

                    <main className={`flex-1 ${noPadding ? 'overflow-hidden' : 'px-6 py-6'}`}>
                        {!noPadding && flash?.success && (
                            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                                {flash.success}
                            </div>
                        )}
                        {!noPadding && flash?.error && (
                            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                                {flash.error}
                            </div>
                        )}
                        {!noPadding && flash?.info && (
                            <div className="mb-4 bg-sky-50 border border-sky-200 text-sky-800 px-4 py-3 rounded-xl text-sm">
                                {flash.info}
                            </div>
                        )}
                        {children}
                    </main>
                </div>
            </div>
            <BacklogFab />
        </>
    );
}
