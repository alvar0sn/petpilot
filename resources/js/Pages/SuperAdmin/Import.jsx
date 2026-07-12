import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';

export default function Import({ tenant }) {
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [file, setFile] = useState(null);

    const { post, processing } = useForm();

    async function handlePreview(e) {
        e.preventDefault();
        if (!file) return;
        setPreviewing(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('_token', document.querySelector('meta[name=csrf-token]')?.content);
        try {
            const res = await axios.post(route('super-admin.import.preview', tenant.id), fd);
            setPreview(res.data);
        } catch {
            alert('Error al procesar el archivo.');
        } finally {
            setPreviewing(false);
        }
    }

    function handleConfirm(e) {
        e.preventDefault();
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        // Use native form submission for file upload with Inertia
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route('super-admin.import.confirm', tenant.id);
        form.enctype = 'multipart/form-data';
        const tokenInput = document.createElement('input');
        tokenInput.name = '_token';
        tokenInput.value = document.querySelector('meta[name=csrf-token]')?.content;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.name = 'file';
        form.appendChild(tokenInput);
        // Can't reuse file input, so use axios instead
        axios.post(route('super-admin.import.confirm', tenant.id), fd)
            .then(() => { window.location = route('super-admin.tenants.show', tenant.id); })
            .catch(() => alert('Error en la importación.'));
    }

    return (
        <SuperAdminLayout title={`Importar clientes — ${tenant.nombre}`}>
            <div className="mb-4">
                <Link href={route('super-admin.tenants.show', tenant.id)} className="text-sm text-gray-500 hover:text-gray-700">
                    ← Volver
                </Link>
            </div>

            <div className="max-w-2xl space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                    <strong>Formato esperado:</strong> CSV con columnas <code>nombre</code>, <code>telefono</code> y opcionalmente <code>email</code>.
                    La deduplicación es por teléfono — los duplicados se omiten.
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                    <form onSubmit={handlePreview} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo CSV</label>
                            <input
                                type="file"
                                accept=".csv,.txt"
                                onChange={e => { setFile(e.target.files[0]); setPreview(null); }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!file || previewing}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                        >
                            {previewing ? 'Procesando...' : 'Ver preview'}
                        </button>
                    </form>
                </div>

                {preview && (
                    <div className="bg-white rounded-xl shadow p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center text-sm">
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-green-700">{preview.new.length}</div>
                                <div className="text-green-600">Nuevos</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-yellow-700">{preview.skipped.length}</div>
                                <div className="text-yellow-600">Duplicados</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-red-700">{preview.errors.length}</div>
                                <div className="text-red-600">Errores</div>
                            </div>
                        </div>

                        {preview.new.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Nuevos a importar</h3>
                                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-xs">
                                    {preview.new.map((r, i) => (
                                        <div key={i} className="px-3 py-2 flex justify-between">
                                            <span>{r.nombre}</span>
                                            <span className="text-gray-400">{r.telefono}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {preview.new.length > 0 && (
                            <button
                                onClick={handleConfirm}
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                Confirmar importación de {preview.new.length} clientes
                            </button>
                        )}
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
}
