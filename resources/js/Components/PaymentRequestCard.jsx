import { useState } from 'react';

const estadoLabels = {
    pendiente: { label: 'Pendiente de pago', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    aprobado: { label: 'Pagado', className: 'bg-green-50 text-green-700 border-green-200' },
    rechazado: { label: 'Rechazado', className: 'bg-red-50 text-red-700 border-red-200' },
    cancelado: { label: 'Cancelado', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
    expirado: { label: 'Expirado', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
};

export default function PaymentRequestCard({ link, estado = 'pendiente', waSent }) {
    const [copied, setCopied] = useState(false);
    const info = estadoLabels[estado] ?? estadoLabels.pendiente;

    async function handleCopy() {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="border rounded-lg p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${info.className}`}>
                    {info.label}
                </span>
                {waSent != null && (
                    <span className={`text-xs whitespace-nowrap ${waSent ? 'text-green-600' : 'text-zinc-400'}`}>
                        {waSent ? '✓ Enviado por WhatsApp' : 'No se envió por WhatsApp'}
                    </span>
                )}
            </div>
            <div className="flex gap-2">
                <input readOnly value={link} onFocus={e => e.target.select()}
                    className="flex-1 text-xs font-mono border-gray-200 rounded-lg bg-zinc-50" />
                <button type="button" onClick={handleCopy}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                    {copied ? 'Copiado' : 'Copiar'}
                </button>
            </div>
        </div>
    );
}
