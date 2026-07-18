import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const TYPES = {
    feature:     { label: 'Feature',  color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
    fix:         { label: 'Fix',      color: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' },
    improvement: { label: 'Mejora',   color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
};

export default function BacklogFab() {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);

    if (auth?.user?.role !== 'super_admin') return null;

    const form = useForm({
        title:       '',
        description: '',
        type:        'feature',
        source_url:  '',
    });

    function openModal() {
        form.setData('source_url', window.location.href);
        setOpen(true);
    }

    function close() {
        setOpen(false);
        form.reset();
        form.clearErrors();
    }

    function submit(e) {
        e.preventDefault();
        form.post(route('super-admin.backlog.store'), {
            preserveScroll: true,
            onSuccess: close,
        });
    }

    return (
        <>
            <button onClick={openModal} title="Agregar al backlog"
                className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-zinc-900 hover:bg-zinc-700 text-white rounded-full shadow-sm flex items-center justify-center transition-colors">
                <i className="ti ti-plus" style={{ fontSize: '18px' }} />
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-5 w-full max-w-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-zinc-800 text-sm">Agregar al backlog</h3>
                            <button onClick={close} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <i className="ti ti-x" style={{ fontSize: '16px' }} />
                            </button>
                        </div>

                        <p className="text-[11px] text-zinc-400 truncate">{form.data.source_url}</p>

                        <form onSubmit={submit} className="space-y-3">
                            <div>
                                <input autoFocus placeholder="Título *"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                                    value={form.data.title}
                                    onChange={e => form.setData('title', e.target.value)} />
                                {form.errors.title && (
                                    <p className="text-rose-500 text-xs mt-0.5">{form.errors.title}</p>
                                )}
                            </div>

                            <textarea rows={2} placeholder="Descripción (opcional)"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                                value={form.data.description}
                                onChange={e => form.setData('description', e.target.value)} />

                            <div className="flex gap-2">
                                {Object.entries(TYPES).map(([key, t]) => (
                                    <button key={key} type="button"
                                        onClick={() => form.setData('type', key)}
                                        className={`flex-1 py-1 rounded-full text-xs font-medium transition-colors ${
                                            form.data.type === key
                                                ? t.color
                                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                                        }`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={close}
                                    className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={!form.data.title || form.processing}
                                    className="flex-1 bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors">
                                    {form.processing ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
