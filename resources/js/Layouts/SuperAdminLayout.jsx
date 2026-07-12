import { Link, usePage } from '@inertiajs/react';
import BacklogFab from '@/Components/BacklogFab';

export default function SuperAdminLayout({ children, title }) {
    const { auth, impersonating, tenant } = usePage().props;

    return (
        <><div className="min-h-screen bg-gray-100">
            {impersonating && tenant && (
                <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium">
                    <span>👁 Estás viendo el panel de <strong>{tenant.nombre}</strong></span>
                    <Link
                        href={route('super-admin.impersonate.stop')}
                        method="delete"
                        as="button"
                        className="bg-white text-amber-700 px-3 py-1 rounded text-xs font-bold hover:bg-amber-100"
                    >
                        Salir de impersonación
                    </Link>
                </div>
            )}

            <nav className="bg-indigo-900 text-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-6">
                            <Link href={route('super-admin.index')} className="text-lg font-bold tracking-tight">
                                VETRKT <span className="text-indigo-300 text-sm font-normal">Super Admin</span>
                            </Link>
                            <Link href={route('super-admin.index')} className="text-sm text-indigo-200 hover:text-white">
                                Tenants
                            </Link>
                            <Link href={route('super-admin.owners.index')} className="text-sm text-indigo-200 hover:text-white">
                                Clientes
                            </Link>
                            <Link href={route('super-admin.logs')} className="text-sm text-indigo-200 hover:text-white">
                                Logs
                            </Link>
                            <Link href={route('super-admin.backlog.index')} className="text-sm text-indigo-200 hover:text-white">
                                Backlog
                            </Link>
                            <Link href={route('super-admin.agency-users.index')} className="text-sm text-indigo-200 hover:text-white">
                                Equipo
                            </Link>
                            <Link href={route('super-admin.system-settings.index')} className="text-sm text-indigo-200 hover:text-white">
                                Infraestructura
                            </Link>
                        </div>
                        <span className="text-indigo-300 text-sm">{auth.user?.email}</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
                {children}
            </main>
        </div>
        <BacklogFab /></>
    );
}
