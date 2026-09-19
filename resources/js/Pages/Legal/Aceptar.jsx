import { Head, useForm } from '@inertiajs/react';

const TYPE_LABELS = {
    tos: 'Términos y Condiciones',
    data_agreement: 'Convenio de Confidencialidad y Tratamiento de Datos Personales',
};

export default function Aceptar({ documents }) {
    const { data, setData, post, processing, errors } = useForm({ accepted: false });

    const submit = (e) => {
        e.preventDefault();
        post(route('legal.accept.store'));
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Head title="Actualización de términos" />

            <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-8">
                <h1 className="text-lg font-bold text-zinc-900">Actualizamos nuestros términos</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Hubo cambios en los siguientes documentos. Para seguir usando Petpilot necesitamos que confirmes
                    que los leíste y los aceptas.
                </p>

                <div className="mt-5 space-y-2">
                    {documents.map((doc) => (
                        <div key={doc.type} className="border border-zinc-200 rounded-lg px-3 py-2">
                            <p className="text-sm font-medium text-zinc-800">
                                {TYPE_LABELS[doc.type] ?? doc.type} — versión {doc.version}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={route('legal.terminos')} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        Ver Términos y Condiciones
                    </a>
                    <a href={route('legal.tratamiento-datos')} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        Ver Convenio de Confidencialidad y Tratamiento de Datos
                    </a>
                </div>

                <form onSubmit={submit} className="mt-6">
                    <label className="flex items-start gap-2 text-sm text-zinc-700">
                        <input
                            type="checkbox"
                            checked={data.accepted}
                            onChange={(e) => setData('accepted', e.target.checked)}
                            className="mt-0.5 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                        />
                        <span>
                            He leído y acepto los Términos y Condiciones y el Convenio de Confidencialidad y
                            Tratamiento de Datos Personales de Petpilot.
                        </span>
                    </label>
                    {errors.accepted && <p className="mt-2 text-xs text-rose-600">{errors.accepted}</p>}

                    <button
                        type="submit"
                        disabled={!data.accepted || processing}
                        className="mt-5 w-full bg-zinc-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Aceptar
                    </button>
                </form>
            </div>
        </div>
    );
}
