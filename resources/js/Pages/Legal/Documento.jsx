import { Head } from '@inertiajs/react';

export default function Documento({ title, document }) {
    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <Head title={title} />

            <div className="mx-auto max-w-3xl bg-white rounded-lg shadow-md px-6 py-8 sm:px-10">
                <h1 className="text-xl font-bold text-zinc-900">{title}</h1>

                {document ? (
                    <>
                        <p className="mt-1 text-xs text-zinc-500">
                            Versión {document.version}
                            {document.published_at && ` · publicada el ${new Date(document.published_at).toLocaleDateString('es-MX')}`}
                        </p>
                        <div
                            className="prose prose-sm max-w-none mt-6 text-zinc-700"
                            dangerouslySetInnerHTML={{ __html: document.content }}
                        />
                    </>
                ) : (
                    <p className="mt-6 text-sm text-zinc-500">
                        Este documento todavía no ha sido publicado.
                    </p>
                )}
            </div>
        </div>
    );
}
