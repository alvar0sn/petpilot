import { useState } from 'react';
import PaymentRequestCard from '@/Components/PaymentRequestCard';

export default function SolicitarPagoMpButton({ ticket }) {
    const latest = ticket.payment_requests?.[0];
    const [result, setResult] = useState(
        latest ? { link: route('payment.public', latest.token), estado: latest.estado, waSent: null } : null
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleClick() {
        setLoading(true);
        setError(null);
        try {
            const { default: axios } = await import('axios');
            const r = await axios.post(route('pos.tickets.payment-requests.store', ticket.id));
            setResult({ link: r.data.link, estado: r.data.payment_request.estado, waSent: r.data.wa_sent });
        } catch (e) {
            setError(e.response?.data?.error ?? 'No se pudo generar el link de pago.');
        } finally {
            setLoading(false);
        }
    }

    if (result) {
        return <PaymentRequestCard link={result.link} estado={result.estado} waSent={result.waSent} />;
    }

    return (
        <div>
            <button type="button" onClick={handleClick} disabled={loading}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors">
                {loading ? 'Generando link…' : 'Solicitar pago por Mercado Pago'}
            </button>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}
