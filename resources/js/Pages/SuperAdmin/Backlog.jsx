import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const COLUMN_STYLE = {
    backlog:     { header: 'bg-gray-100 text-gray-700',   ring: 'ring-gray-200' },
    in_progress: { header: 'bg-blue-50 text-blue-700',    ring: 'ring-blue-200' },
    done:        { header: 'bg-green-50 text-green-700',  ring: 'ring-green-200' },
};

function TypeBadge({ type, types }) {
    const t = types[type];
    if (!t) return null;
    return (
        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.color}`}>
            {t.label}
        </span>
    );
}

function ItemCard({ item, types, columnKeys, onEdit }) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const idx = columnKeys.indexOf(item.status);
    const canBack = idx > 0;
    const canForward = idx < columnKeys.length - 1;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{item.title}</p>
                <TypeBadge type={item.type} types={types} />
            </div>

            {item.description && (
                <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
            )}

            {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noreferrer"
                    className="block text-[11px] text-indigo-400 hover:text-indigo-600 truncate"
                    title={item.source_url}>
                    📍 {item.source_url.replace(/^https?:\/\/[^/]+/, '')}
                </a>
            )}

            <div className="flex items-center justify-between pt-1">
                {/* Move buttons */}
                <div className="flex gap-1">
                    {canBack && (
                        <button
                            onClick={() => router.patch(route('super-admin.backlog.move', [item.id, 'backward']))}
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                            title="Mover atrás">
                            ←
                        </button>
                    )}
                    {canForward && (
                        <button
                            onClick={() => router.patch(route('super-admin.backlog.move', [item.id, 'forward']))}
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                            title="Mover adelante">
                            →
                        </button>
                    )}
                </div>

                {/* Edit / Delete */}
                <div className="flex gap-1.5 items-center">
                    <button onClick={() => onEdit(item)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                        Editar
                    </button>
                    {!confirmDelete ? (
                        <button onClick={() => setConfirmDelete(true)}
                            className="text-xs text-red-400 hover:text-red-600">
                            Eliminar
                        </button>
                    ) : (
                        <span className="flex items-center gap-1 text-xs">
                            <span className="text-red-600">¿Seguro?</span>
                            <button onClick={() => router.delete(route('super-admin.backlog.destroy', item.id))}
                                className="text-red-600 font-semibold hover:underline">Sí</button>
                            <button onClick={() => setConfirmDelete(false)}
                                className="text-gray-400 hover:text-gray-600">No</button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function ItemModal({ types, editItem, onClose }) {
    const isEdit = !!editItem;
    const form = useForm({
        title:       editItem?.title       ?? '',
        description: editItem?.description ?? '',
        type:        editItem?.type        ?? 'feature',
    });

    function submit(e) {
        e.preventDefault();
        if (isEdit) {
            form.put(route('super-admin.backlog.update', editItem.id), { onSuccess: onClose });
        } else {
            form.post(route('super-admin.backlog.store'), { onSuccess: onClose });
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
                <h3 className="font-semibold text-gray-800">
                    {isEdit ? 'Editar ítem' : 'Nuevo ítem'}
                </h3>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
                        <input autoFocus
                            className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                            value={form.data.title}
                            onChange={e => form.setData('title', e.target.value)} />
                        {form.errors.title && <p className="text-red-500 text-xs mt-0.5">{form.errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                        <textarea rows={3}
                            className="w-full border-gray-300 rounded-lg text-sm"
                            value={form.data.description}
                            onChange={e => form.setData('description', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Tipo</label>
                        <div className="flex gap-2">
                            {Object.entries(types).map(([key, t]) => (
                                <button key={key} type="button"
                                    onClick={() => form.setData('type', key)}
                                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                                        form.data.type === key
                                            ? `${t.color} border-current`
                                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                    }`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!form.data.title || form.processing}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                            {form.processing ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Backlog({ columns, types, items }) {
    const { flash } = usePage().props;
    const [modal, setModal] = useState(null); // null | 'new' | item object
    const columnKeys = Object.keys(columns);

    const editItem = modal && modal !== 'new' ? modal : null;

    return (
        <SuperAdminLayout title="Backlog">
            {modal && (
                <ItemModal
                    types={types}
                    editItem={editItem}
                    onClose={() => setModal(null)}
                />
            )}

            {/* Flash */}
            {flash?.success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
                    {flash.success}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-sm text-gray-500">
                        {Object.values(items).flat().length} ítem{Object.values(items).flat().length !== 1 ? 's' : ''} en total
                    </p>
                </div>
                <button onClick={() => setModal('new')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                    + Nuevo ítem
                </button>
            </div>

            {/* Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {columnKeys.map(key => {
                    const col = COLUMN_STYLE[key] ?? { header: 'bg-gray-100 text-gray-700', ring: 'ring-gray-200' };
                    const colItems = items[key] ?? [];
                    return (
                        <div key={key} className={`rounded-2xl ring-1 ${col.ring} bg-white/60 flex flex-col`}>
                            {/* Column header */}
                            <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${col.header}`}>
                                <span className="font-semibold text-sm">{columns[key]}</span>
                                <span className="text-xs font-medium opacity-70">{colItems.length}</span>
                            </div>

                            {/* Cards */}
                            <div className="p-3 space-y-2 flex-1">
                                {colItems.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        types={types}
                                        columnKeys={columnKeys}
                                        onEdit={item => setModal(item)}
                                    />
                                ))}
                                {colItems.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-6">Sin ítems</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

        </SuperAdminLayout>
    );
}
