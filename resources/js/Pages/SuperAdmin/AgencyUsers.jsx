import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AgencyUsers({ users }) {
    const { auth, flash } = usePage().props;
    const newForm = useForm({ nombre: '', apellido: '', email: '', password: '' });
    const [editUser, setEditUser] = useState(null);
    const editForm = useForm({});
    const [pwdUser, setPwdUser] = useState(null);
    const pwdForm = useForm({ password: '' });

    function openEdit(u) {
        setEditUser(u);
        editForm.setData({ nombre: u.nombre, apellido: u.apellido ?? '', email: u.email, activo: u.activo });
    }

    return (
        <SuperAdminLayout title="Usuarios de la agencia">
            {flash?.success && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm">
                    {flash.success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Super admins activos</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Acceso completo a todas las funciones del panel.</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {users.map(u => (
                            <div key={u.id} className="px-5 py-3.5 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                                    {u.nombre.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {u.nombre} {u.apellido}
                                        {u.id === auth.user?.id && <span className="ml-1.5 text-xs text-gray-400">(tú)</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                                </div>
                                {!u.activo && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ring-1 ring-gray-200 shrink-0">inactivo</span>
                                )}
                                <div className="flex gap-3 shrink-0">
                                    <button onClick={() => openEdit(u)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                                        editar
                                    </button>
                                    <button onClick={() => { setPwdUser(u); pwdForm.reset(); }}
                                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                        contraseña
                                    </button>
                                    {u.id !== auth.user?.id && (
                                        <button onClick={() => { if (confirm('¿Eliminar este usuario?')) router.delete(route('super-admin.agency-users.destroy', u.id)); }}
                                            className="text-xs text-red-500 hover:text-red-700 transition-colors">
                                            eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <p className="px-5 py-4 text-sm text-gray-400">No hay usuarios.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <h2 className="font-semibold text-gray-800 mb-4">Agregar super admin</h2>
                    <form onSubmit={e => { e.preventDefault(); newForm.post(route('super-admin.agency-users.store'), { onSuccess: () => newForm.reset() }); }}
                        className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                                <input className="w-full border-gray-300 rounded-lg text-sm"
                                    value={newForm.data.nombre} onChange={e => newForm.setData('nombre', e.target.value)} />
                                {newForm.errors.nombre && <p className="text-red-500 text-xs mt-0.5">{newForm.errors.nombre}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
                                <input className="w-full border-gray-300 rounded-lg text-sm"
                                    value={newForm.data.apellido} onChange={e => newForm.setData('apellido', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico *</label>
                            <input type="email" className="w-full border-gray-300 rounded-lg text-sm"
                                value={newForm.data.email} onChange={e => newForm.setData('email', e.target.value)} />
                            {newForm.errors.email && <p className="text-red-500 text-xs mt-0.5">{newForm.errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña *</label>
                            <input type="password" className="w-full border-gray-300 rounded-lg text-sm"
                                value={newForm.data.password} onChange={e => newForm.setData('password', e.target.value)} />
                            {newForm.errors.password && <p className="text-red-500 text-xs mt-0.5">{newForm.errors.password}</p>}
                        </div>
                        <button type="submit" disabled={newForm.processing}
                            className="w-full bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                            {newForm.processing ? 'Creando…' : 'Crear usuario'}
                        </button>
                    </form>
                </div>
            </div>

            {editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="font-semibold text-gray-900">Editar usuario</h3>
                        <form onSubmit={e => { e.preventDefault(); editForm.put(route('super-admin.agency-users.update', editUser.id), { onSuccess: () => setEditUser(null) }); }}
                            className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm"
                                        value={editForm.data.nombre ?? ''} onChange={e => editForm.setData('nombre', e.target.value)} />
                                    {editForm.errors.nombre && <p className="text-red-500 text-xs mt-0.5">{editForm.errors.nombre}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
                                    <input className="w-full border-gray-300 rounded-lg text-sm"
                                        value={editForm.data.apellido ?? ''} onChange={e => editForm.setData('apellido', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico *</label>
                                <input type="email" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={editForm.data.email ?? ''} onChange={e => editForm.setData('email', e.target.value)} />
                                {editForm.errors.email && <p className="text-red-500 text-xs mt-0.5">{editForm.errors.email}</p>}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300"
                                    checked={editForm.data.activo ?? true}
                                    onChange={e => editForm.setData('activo', e.target.checked)} />
                                <span className="text-sm text-gray-600">Activo</span>
                            </label>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setEditUser(null)}
                                    className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={editForm.processing}
                                    className="flex-1 bg-indigo-700 text-white py-2 rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                                    {editForm.processing ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {pwdUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
                        <h3 className="font-semibold text-gray-900">Cambiar contraseña</h3>
                        <p className="text-sm text-gray-500">{pwdUser.nombre} {pwdUser.apellido}</p>
                        <form onSubmit={e => { e.preventDefault(); pwdForm.put(route('super-admin.agency-users.password', pwdUser.id), { onSuccess: () => { setPwdUser(null); pwdForm.reset(); } }); }}
                            className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña *</label>
                                <input type="password" className="w-full border-gray-300 rounded-lg text-sm"
                                    value={pwdForm.data.password} onChange={e => pwdForm.setData('password', e.target.value)} />
                                {pwdForm.errors.password && <p className="text-red-500 text-xs mt-0.5">{pwdForm.errors.password}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setPwdUser(null)}
                                    className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={pwdForm.processing}
                                    className="flex-1 bg-indigo-700 text-white py-2 rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50 transition-colors">
                                    {pwdForm.processing ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}
