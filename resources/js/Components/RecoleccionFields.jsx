function fmtMxn(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

/**
 * Toggle + tarifa de recolección reutilizado en los formularios de agendado
 * de hotel/guardería, grooming, veterinaria, entrenamiento y paseos. Espera que
 * el `form` (useForm de Inertia) tenga los campos: recoleccion, recoleccion_rate_id,
 * recoleccion_tipo_viaje, recoleccion_direccion.
 */
export default function RecoleccionFields({ form, collectionRates, defaultDireccion }) {
    if (!collectionRates?.length) return null;

    return (
        <div>
            <label className="flex items-center justify-between cursor-pointer px-3 py-2.5 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors">
                <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">🚚 Recolección</span>
                <button type="button"
                    onClick={() => form.setData(d => ({
                        ...d,
                        recoleccion: !d.recoleccion,
                        recoleccion_direccion: !d.recoleccion && !d.recoleccion_direccion ? (defaultDireccion ?? '') : d.recoleccion_direccion,
                    }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.data.recoleccion ? 'bg-cyan-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.data.recoleccion ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </label>

            {form.data.recoleccion && (
                <div className="mt-1.5 space-y-1.5">
                    <select className="w-full border-gray-300 rounded-lg text-sm"
                        value={form.data.recoleccion_rate_id}
                        onChange={e => form.setData('recoleccion_rate_id', e.target.value)}>
                        <option value="">Tarifa de recolección...</option>
                        {collectionRates.map(r => (
                            <option key={r.id} value={r.id}>{r.nombre} — {fmtMxn(r.precio)}</option>
                        ))}
                    </select>
                    {form.errors.recoleccion_rate_id && <p className="text-rose-500 text-xs">{form.errors.recoleccion_rate_id}</p>}

                    <select className="w-full border-gray-300 rounded-lg text-sm"
                        value={form.data.recoleccion_tipo_viaje}
                        onChange={e => form.setData('recoleccion_tipo_viaje', e.target.value)}>
                        <option value="recoleccion">Solo recolección</option>
                        <option value="entrega">Solo entrega</option>
                        <option value="ida_y_vuelta">Ida y vuelta</option>
                    </select>

                    <textarea className="w-full border-gray-300 rounded-lg text-sm resize-none" rows={2}
                        placeholder="Dirección (opcional — si se deja vacío se usa la registrada del dueño)"
                        value={form.data.recoleccion_direccion}
                        onChange={e => form.setData('recoleccion_direccion', e.target.value)} />

                    <p className="text-xs text-zinc-400">La tarifa se sumará al ticket de este servicio.</p>
                </div>
            )}
        </div>
    );
}

export const recoleccionFormDefaults = {
    recoleccion: false,
    recoleccion_rate_id: '',
    recoleccion_tipo_viaje: 'recoleccion',
    recoleccion_direccion: '',
};
