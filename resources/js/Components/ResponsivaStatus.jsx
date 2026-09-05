import { router } from '@inertiajs/react';
import { useState } from 'react';

export default function ResponsivaStatus({ sendUrl, downloadUrl, enviadoAt, firmadoAt, compact = false }) {
    const [sending, setSending] = useState(false);

    function send() {
        setSending(true);
        router.post(sendUrl, {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const url = page.props.flash?.responsiva_url;
                if (url) navigator.clipboard?.writeText(url).catch(() => {});
            },
            onFinish: () => setSending(false),
        });
    }

    const badgeClass = firmadoAt
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : enviadoAt
            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
            : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200';
    const badgeLabel = firmadoAt ? 'Responsiva firmada' : enviadoAt ? 'Responsiva sin firmar' : 'Responsiva no enviada';
    const btnSize = compact ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

    return (
        <div className={`flex items-center gap-2 flex-wrap ${compact ? 'text-xs' : 'text-sm'}`}>
            <span className={`px-2 py-0.5 rounded-full font-medium inline-flex items-center text-xs ${badgeClass}`}>{badgeLabel}</span>
            {!firmadoAt && (
                <button type="button" onClick={send} disabled={sending}
                    className={`${btnSize} border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors`}>
                    {sending ? 'Enviando...' : enviadoAt ? 'Reenviar responsiva' : 'Enviar responsiva'}
                </button>
            )}
            {firmadoAt && (
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                    className={`${btnSize} border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors`}>
                    Descargar responsiva
                </a>
            )}
        </div>
    );
}
