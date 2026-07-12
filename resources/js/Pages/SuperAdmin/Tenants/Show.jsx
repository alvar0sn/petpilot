import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Checkbox from '@/Components/Checkbox';
import Modal from '@/Components/Modal';

const TIMEZONE_OPTIONS = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (Centro)' },
    { value: 'America/Cancun', label: 'Cancún (Sureste)' },
    { value: 'America/Monterrey', label: 'Monterrey (Centro)' },
    { value: 'America/Chihuahua', label: 'Chihuahua (Pacífico/Montaña)' },
    { value: 'America/Hermosillo', label: 'Hermosillo (Pacífico, sin horario de verano)' },
    { value: 'America/Mazatlan', label: 'Mazatlán (Pacífico)' },
    { value: 'America/Tijuana', label: 'Tijuana (Pacífico - frontera)' },
];

const roleLabel = { tenant_admin: 'Administrador', colaborador: 'Colaborador' };
const roleColor = { tenant_admin: 'bg-indigo-100 text-indigo-700', colaborador: 'bg-gray-100 text-gray-600' };

function StatCard({ label, value }) {
    return (
        <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}

function LogBadge({ status }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            status === 'success' ? 'bg-green-100 text-green-700' :
            status === 'skipped' ? 'bg-gray-100 text-gray-600' :
            'bg-red-100 text-red-700'
        }`}>
            {status}
        </span>
    );
}

function TabButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
                active
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
            {children}
        </button>
    );
}

function BusinessDataTab({ tenant }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: tenant.nombre ?? '',
        slug: tenant.slug ?? '',
        timezone: tenant.timezone ?? 'America/Mexico_City',
        estado: tenant.estado ?? 'activo',
        plan_precio: tenant.plan_precio ?? '',
        notas_internas: tenant.notas_internas ?? '',
    });

    function submit(e) {
        e.preventDefault();
        put(route('super-admin.tenants.update', tenant.id));
    }

    return (
        <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 space-y-4 max-w-2xl">
            <h2 className="font-semibold text-gray-900">Datos del negocio</h2>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <InputLabel value="Nombre del negocio" />
                    <TextInput className="mt-1 w-full" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                    <InputError message={errors.nombre} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Slug" />
                    <TextInput className="mt-1 w-full font-mono text-xs" value={data.slug} onChange={e => setData('slug', e.target.value)} />
                    <InputError message={errors.slug} className="mt-1" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <InputLabel value="Zona horaria" />
                    <select
                        className="mt-1 w-full border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={data.timezone}
                        onChange={e => setData('timezone', e.target.value)}
                    >
                        {TIMEZONE_OPTIONS.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Determina cómo se muestran fechas y horas a todos los usuarios de este negocio.</p>
                    <InputError message={errors.timezone} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Estado" />
                    <select
                        className="mt-1 w-full border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={data.estado}
                        onChange={e => setData('estado', e.target.value)}
                    >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                        <option value="trial">Trial</option>
                    </select>
                    <InputError message={errors.estado} className="mt-1" />
                </div>
            </div>

            <div>
                <InputLabel value="Plan / Precio" />
                <TextInput className="mt-1 w-full" value={data.plan_precio} onChange={e => setData('plan_precio', e.target.value)} placeholder="Ej: $1,500/mes" />
                <InputError message={errors.plan_precio} className="mt-1" />
            </div>

            <div>
                <InputLabel value="Notas internas" />
                <textarea
                    className="mt-1 w-full border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={4}
                    value={data.notas_internas}
                    onChange={e => setData('notas_internas', e.target.value)}
                />
                <InputError message={errors.notas_internas} className="mt-1" />
            </div>

            <div className="flex justify-end">
                <PrimaryButton disabled={processing}>Guardar cambios</PrimaryButton>
            </div>
        </form>
    );
}

function PasswordModal({ tenant, user, onClose }) {
    const { data, setData, put, processing, errors, reset } = useForm({ password: '' });

    function submit(e) {
        e.preventDefault();
        put(route('super-admin.tenants.users.password', [tenant.id, user.id]), {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <Modal show onClose={onClose} maxWidth="sm">
            <form onSubmit={submit} className="p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Restablecer contraseña</h3>
                <p className="text-sm text-gray-500">Para {user.nombre} {user.apellido} ({user.email})</p>
                <div>
                    <InputLabel value="Nueva contraseña" />
                    <TextInput type="password" className="mt-1 w-full" value={data.password} onChange={e => setData('password', e.target.value)} />
                    <InputError message={errors.password} className="mt-1" />
                </div>
                <div className="flex justify-end gap-2">
                    <SecondaryButton type="button" onClick={onClose}>Cancelar</SecondaryButton>
                    <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}

function EditUserForm({ tenant, user, onCancel }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: user.nombre ?? '',
        apellido: user.apellido ?? '',
        email: user.email ?? '',
        role: user.role ?? 'colaborador',
        activo: !!user.activo,
    });

    function submit(e) {
        e.preventDefault();
        put(route('super-admin.tenants.users.update', [tenant.id, user.id]), { onSuccess: onCancel });
    }

    return (
        <form onSubmit={submit} className="border-2 border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <InputLabel value="Nombre" />
                    <TextInput className="mt-1 w-full text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                    <InputError message={errors.nombre} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Apellido" />
                    <TextInput className="mt-1 w-full text-sm" value={data.apellido} onChange={e => setData('apellido', e.target.value)} />
                    <InputError message={errors.apellido} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Email" />
                    <TextInput type="email" className="mt-1 w-full text-sm" value={data.email} onChange={e => setData('email', e.target.value)} />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Rol" />
                    <select
                        className="mt-1 w-full border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={data.role}
                        onChange={e => setData('role', e.target.value)}
                    >
                        <option value="tenant_admin">Administrador</option>
                        <option value="colaborador">Colaborador</option>
                    </select>
                    <InputError message={errors.role} className="mt-1" />
                </div>
            </div>
            <label className="flex items-center gap-2">
                <Checkbox checked={data.activo} onChange={e => setData('activo', e.target.checked)} />
                <span className="text-sm text-gray-700">Usuario activo</span>
            </label>
            <div className="flex gap-2">
                <PrimaryButton disabled={processing}>Guardar cambios</PrimaryButton>
                <SecondaryButton type="button" onClick={onCancel}>Cancelar</SecondaryButton>
            </div>
        </form>
    );
}

function UserRow({ tenant, user }) {
    const [editing, setEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function destroy() {
        if (confirm(`¿Eliminar al usuario ${user.nombre} ${user.apellido}? Esta acción no se puede deshacer.`)) {
            router.delete(route('super-admin.tenants.users.destroy', [tenant.id, user.id]));
        }
    }

    if (editing) {
        return <EditUserForm tenant={tenant} user={user} onCancel={() => setEditing(false)} />;
    }

    return (
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{user.nombre} {user.apellido}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel[user.role] ?? user.role}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    Editar
                </button>
                <button onClick={() => setShowPassword(true)} className="text-xs text-amber-600 hover:text-amber-800 font-medium">
                    Restablecer contraseña
                </button>
                <button onClick={destroy} className="text-xs text-red-600 hover:text-red-800 font-medium">
                    Eliminar
                </button>
            </div>
            {showPassword && <PasswordModal tenant={tenant} user={user} onClose={() => setShowPassword(false)} />}
        </div>
    );
}

function NewUserForm({ tenant, onCancel }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: '',
        apellido: '',
        email: '',
        role: 'tenant_admin',
        password: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('super-admin.tenants.users.store', tenant.id), {
            onSuccess: () => { reset(); onCancel(); },
        });
    }

    return (
        <form onSubmit={submit} className="bg-white rounded-xl shadow p-5 space-y-3 border-2 border-indigo-200">
            <h3 className="font-semibold text-gray-700">Nuevo usuario</h3>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <InputLabel value="Nombre" />
                    <TextInput className="mt-1 w-full text-sm" value={data.nombre} onChange={e => setData('nombre', e.target.value)} />
                    <InputError message={errors.nombre} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Apellido" />
                    <TextInput className="mt-1 w-full text-sm" value={data.apellido} onChange={e => setData('apellido', e.target.value)} />
                    <InputError message={errors.apellido} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Email" />
                    <TextInput type="email" className="mt-1 w-full text-sm" value={data.email} onChange={e => setData('email', e.target.value)} />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div>
                    <InputLabel value="Rol" />
                    <select
                        className="mt-1 w-full border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={data.role}
                        onChange={e => setData('role', e.target.value)}
                    >
                        <option value="tenant_admin">Administrador</option>
                        <option value="colaborador">Colaborador</option>
                    </select>
                    <InputError message={errors.role} className="mt-1" />
                </div>
                <div className="col-span-2">
                    <InputLabel value="Contraseña" />
                    <TextInput type="password" className="mt-1 w-full text-sm" value={data.password} onChange={e => setData('password', e.target.value)} />
                    <InputError message={errors.password} className="mt-1" />
                </div>
            </div>
            <div className="flex gap-2">
                <PrimaryButton disabled={processing}>Crear usuario</PrimaryButton>
                <SecondaryButton type="button" onClick={onCancel}>Cancelar</SecondaryButton>
            </div>
        </form>
    );
}

function OwnerUsersTab({ tenant }) {
    const [showNew, setShowNew] = useState(false);
    const users = tenant.users ?? [];

    return (
        <div className="space-y-3 max-w-3xl">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Usuarios del negocio</h2>
                {!showNew && (
                    <button onClick={() => setShowNew(true)} className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium">
                        + Agregar usuario
                    </button>
                )}
            </div>

            {showNew && <NewUserForm tenant={tenant} onCancel={() => setShowNew(false)} />}

            {users.map(user => <UserRow key={user.id} tenant={tenant} user={user} />)}

            {users.length === 0 && (
                <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                    Este negocio aún no tiene usuarios. Agrega al dueño o administrador →
                </div>
            )}
        </div>
    );
}

function WebhookField({ label, fieldKey, value, onChange, error, tenantId }) {
    const [status, setStatus] = useState('idle'); // idle | loading | ok | error
    const [detail, setDetail] = useState('');

    async function test() {
        if (!value) return;
        setStatus('loading');
        setDetail('');
        try {
            const r = await (await import('axios')).default.post(
                route('super-admin.tenants.ghl.test', tenantId),
                { webhook_type: fieldKey }
            );
            setStatus(r.data.ok ? 'ok' : 'error');
            setDetail(r.data.ok ? `HTTP ${r.data.status}` : (r.data.error ?? `HTTP ${r.data.status}`));
        } catch (e) {
            setStatus('error');
            setDetail(e.response?.data?.error ?? e.message ?? 'Error de conexión');
        }
    }

    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-1 flex gap-2 items-center">
                <TextInput
                    className="flex-1 text-xs"
                    value={value}
                    onChange={onChange}
                    placeholder="https://..."
                />
                <button
                    type="button"
                    onClick={test}
                    disabled={!value || status === 'loading'}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                        status === 'ok'    ? 'bg-green-50 border-green-300 text-green-700' :
                        status === 'error' ? 'bg-red-50 border-red-300 text-red-700' :
                        'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    {status === 'loading' ? '…' : status === 'ok' ? '✓' : status === 'error' ? '✗' : 'Probar'}
                </button>
            </div>
            {detail && (
                <p className={`text-[10px] mt-0.5 ${status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{detail}</p>
            )}
            <InputError message={error} className="mt-1" />
        </div>
    );
}

function GhlTab({ tenant, ghlContactLogs, ghlWebhookLogs, errors }) {
    const ghlForm = useForm({
        api_key: '',
        location_id: tenant.ghl_config?.location_id ?? '',
        webhook_recordatorios: tenant.ghl_config?.webhook_recordatorios ?? '',
        webhook_cumpleanos: tenant.ghl_config?.webhook_cumpleanos ?? '',
        webhook_reviews: tenant.ghl_config?.webhook_reviews ?? '',
        webhook_membresia_vencimiento: tenant.ghl_config?.webhook_membresia_vencimiento ?? '',
        webhook_checkin_hotel: tenant.ghl_config?.webhook_checkin_hotel ?? '',
        webhook_checkout_hotel: tenant.ghl_config?.webhook_checkout_hotel ?? '',
        webhook_whatsapp_pos: tenant.ghl_config?.webhook_whatsapp_pos ?? '',
        activo: tenant.ghl_config?.activo ?? false,
    });

    function submitGhl(e) {
        e.preventDefault();
        ghlForm.put(route('super-admin.tenants.ghl', tenant.id));
    }

    return (
        <div className="space-y-6">
            <form onSubmit={submitGhl} className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Configuración GoHighLevel</h2>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="rounded"
                            checked={ghlForm.data.activo}
                            onChange={e => ghlForm.setData('activo', e.target.checked)} />
                        Activo
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <InputLabel value="API Key" />
                        <TextInput className="mt-1 w-full font-mono text-xs"
                            value={ghlForm.data.api_key}
                            onChange={e => ghlForm.setData('api_key', e.target.value)}
                            placeholder={tenant.ghl_config?.api_key ? '(conservar actual)' : 'eyJ...'} />
                        {tenant.ghl_config?.api_key_preview && (
                            <p className="text-xs text-gray-400 mt-1">Actual: {tenant.ghl_config.api_key_preview}</p>
                        )}
                    </div>
                    <div>
                        <InputLabel value="Location ID" />
                        <TextInput className="mt-1 w-full font-mono text-xs"
                            value={ghlForm.data.location_id}
                            onChange={e => ghlForm.setData('location_id', e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {[
                        ['webhook_recordatorios',        'Webhook Recordatorios'],
                        ['webhook_cumpleanos',           'Webhook Cumpleaños'],
                        ['webhook_reviews',              'Webhook Reviews'],
                        ['webhook_membresia_vencimiento','Webhook Membresía por vencer'],
                        ['webhook_checkin_hotel',        'Webhook Check-in Hotel'],
                        ['webhook_checkout_hotel',       'Webhook Check-out Hotel'],
                    ].map(([key, label]) => (
                        <WebhookField
                            key={key}
                            fieldKey={key}
                            label={label}
                            value={ghlForm.data[key]}
                            onChange={e => ghlForm.setData(key, e.target.value)}
                            error={errors?.[key]}
                            tenantId={tenant.id}
                        />
                    ))}
                </div>

                <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">POS / WhatsApp</p>
                    <WebhookField
                        fieldKey="webhook_whatsapp_pos"
                        label="Webhook Ticket WhatsApp (POS)"
                        value={ghlForm.data.webhook_whatsapp_pos}
                        onChange={e => ghlForm.setData('webhook_whatsapp_pos', e.target.value)}
                        error={errors?.webhook_whatsapp_pos}
                        tenantId={tenant.id}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Payload: <span className="font-mono text-[10px]">phone, message, ticket_id</span>
                    </p>
                </div>

                <div className="mt-4 flex justify-end">
                    <PrimaryButton disabled={ghlForm.processing}>Guardar GHL</PrimaryButton>
                </div>
            </form>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Logs de contacto GHL</h3>
                    <div className="space-y-2">
                        {ghlContactLogs.length === 0 && <p className="text-xs text-gray-400">Sin logs.</p>}
                        {ghlContactLogs.map(log => (
                            <div key={log.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{log.action} — {log.owner?.nombre_completo ?? 'N/A'}</span>
                                <LogBadge status={log.status} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Logs de webhooks GHL</h3>
                    <div className="space-y-2">
                        {ghlWebhookLogs.length === 0 && <p className="text-xs text-gray-400">Sin logs.</p>}
                        {ghlWebhookLogs.map(log => (
                            <div key={log.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{log.webhook_type}</span>
                                <LogBadge status={log.status} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const TABS = [
    { key: 'datos', label: 'Datos del negocio' },
    { key: 'usuarios', label: 'Usuario dueño' },
    { key: 'ghl', label: 'GHL / Webhooks' },
];

export default function TenantShow({ tenant, stats, ghlContactLogs, ghlWebhookLogs }) {
    const { flash, errors } = usePage().props;
    const [tab, setTab] = useState('datos');

    return (
        <SuperAdminLayout title={tenant.nombre}>
            {flash?.success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                    {flash.success}
                </div>
            )}

            <div className="flex gap-3 mb-6">
                <Link href={route('super-admin.index')} className="text-sm text-gray-500 hover:text-gray-700">← Tenants</Link>
                <button
                    onClick={() => router.post(route('super-admin.impersonate.start', tenant.id))}
                    className="ml-auto text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg"
                >
                    👁 Acceder como tenant
                </button>
                <Link href={route('super-admin.import.show', tenant.id)}
                    className="text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg">
                    Importar CSV
                </Link>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Owners" value={stats.owners} />
                <StatCard label="Mascotas" value={stats.pets} />
                <StatCard label="Tickets este mes" value={stats.tickets_mes} />
                <StatCard label="Estancias activas" value={stats.estancias_activas} />
            </div>

            <div className="border-b border-gray-200 mb-6 flex gap-1">
                {TABS.map(t => (
                    <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                        {t.label}
                    </TabButton>
                ))}
            </div>

            {tab === 'datos' && <BusinessDataTab tenant={tenant} />}
            {tab === 'usuarios' && <OwnerUsersTab tenant={tenant} />}
            {tab === 'ghl' && <GhlTab tenant={tenant} ghlContactLogs={ghlContactLogs} ghlWebhookLogs={ghlWebhookLogs} errors={errors} />}
        </SuperAdminLayout>
    );
}
