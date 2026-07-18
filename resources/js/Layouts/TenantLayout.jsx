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
    { label: 'POS',             href: 'pos.index',          icon: 'ti-shopping-cart',    module: 'pos', children: [
        { label: 'Historial',   href: 'pos.history' },
        { label: 'Turnos',      href: 'pos.shift.index' },
        { label: 'Catálogo',    href: 'pos.catalog' },
        { label: 'Descuentos',  href: 'pos.discounts.index' },
    ]},
    { label: 'Landing',         href: 'landing.editor',     icon: 'ti-world',            module: null },
    { label: 'Configuración',   href: 'settings.index',     icon: 'ti-settings',         module: null },
];

function QuickNav({ hasModule }) {
    const [checkinOpen, setCheckinOpen] = useState(false);

    const checkinModules = [
        { label: 'Grooming',     href: 'grooming.index', icon: 'ti-scissors',    module: 'grooming' },
        { label: 'Hotel',        href: 'hotel.index',    icon: 'ti-building',    module: 'hotel' },
        { label: 'Veterinaria',  href: 'vet.index',      icon: 'ti-stethoscope', module: 'veterinaria' },
    ].filter(m => hasModule(m.module));

    return (
        <>
            {checkinOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setCheckinOpen(false)}>
                    <div className="absolute bottom-16 left-1/3 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden min-w-44"
                        onClick={e => e.stopPropagation()}>
                        {checkinModules.map(m => (
                            <Link key={m.href} href={route(m.href)}
                                onClick={() => setCheckinOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                                <i className={`ti ${m.icon} text-zinc-400`} style={{ fontSize: '16px' }} />
                                {m.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-zinc-200 grid grid-cols-3">
                <Link href={route('pos.index')}
                    className="flex flex-col items-center gap-1 py-3 text-zinc-500 hover:text-zinc-900 active:bg-zinc-50 transition-colors">
                    <i className="ti ti-shopping-cart" style={{ fontSize: '20px' }} />
                    <span className="text-[10px] font-medium">Nueva venta</span>
                </Link>
                <button onClick={() => setCheckinOpen(o => !o)}
                    className={`flex flex-col items-center gap-1 py-3 transition-colors ${checkinOpen ? 'text-indigo-600' : 'text-zinc-500 hover:text-zinc-900 active:bg-zinc-50'}`}>
                    <i className="ti ti-login-2" style={{ fontSize: '20px' }} />
                    <span className="text-[10px] font-medium">Check-in</span>
                </button>
                <Link href={route('owners.create')}
                    className="flex flex-col items-center gap-1 py-3 text-zinc-500 hover:text-zinc-900 active:bg-zinc-50 transition-colors">
                    <i className="ti ti-user-plus" style={{ fontSize: '20px' }} />
                    <span className="text-[10px] font-medium">Nuevo cliente</span>
                </Link>
            </div>
        </>
    );
}

export default function TenantLayout({ children, title, noPadding = false }) {
    const { auth, tenant, impersonating, flash, walks_pending_count } = usePage().props;
    const badgeCounts = { walks_pending_count };
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const currentRoute = route().current();

    const [expanded, setExpanded] = useState(() => {
        const init = {};
        nav.forEach(item => {
            if (item.children) init[item.href] = currentRoute?.startsWith(item.href.split('.')[0]) ?? false;
        });
        return init;
    });
    const toggleSection = (href) => setExpanded(prev => ({ ...prev, [href]: !prev[href] }));

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
                            const isOpen = item.children ? expanded[item.href] : false;
                            return (
                                <div key={item.href}>
                                    <div className={`flex items-center rounded-md transition-colors ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                                        <Link
                                            href={route(item.href)}
                                            className="flex items-center gap-2.5 flex-1 px-3 py-2"
                                            style={{ fontSize: '13px' }}
                                        >
                                            <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} />
                                            <span className="flex-1">{item.label}</span>
                                            {badge > 0 && (
                                                <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                                                    {badge > 9 ? '9+' : badge}
                                                </span>
                                            )}
                                        </Link>
                                        {item.children && (
                                            <button onClick={() => toggleSection(item.href)}
                                                className="px-2 py-2 hover:text-zinc-100 transition-colors"
                                                title={isOpen ? 'Colapsar' : 'Expandir'}>
                                                <i className={`ti ti-chevron-down transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ fontSize: '12px' }} />
                                            </button>
                                        )}
                                    </div>
                                    {isOpen && item.children && (
                                        <div className="mt-0.5 space-y-0.5">
                                            {item.children.map(child => {
                                                const childActive = currentRoute?.startsWith(child.href.replace('.index', ''));
                                                return (
                                                    <Link key={child.href} href={route(child.href)}
                                                        className={`flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-md transition-colors ${childActive ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        <i className="ti ti-chevron-right" style={{ fontSize: '10px', opacity: 0.5 }} />
                                                        {child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
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
                            <Link href={route('super-admin.impersonate.stop')} method="post" as="button"
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

                    <main className={`flex-1 ${noPadding ? 'overflow-hidden' : 'px-6 py-6 md:pb-6 pb-20'}`}>
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
            {auth.user?.role !== 'super_admin' && (
                <QuickNav hasModule={hasModule} />
            )}
        </>
    );
}
