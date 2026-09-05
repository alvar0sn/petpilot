import TenantLayout from '@/Layouts/TenantLayout';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import axios from 'axios';

function fmt(n) {
    return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function PackagesCreate({ catalogItems }) {
    const { version } = usePage();
    const [petSearch, setPetSearch] = useState('');
    const [petResults, setPetResults] = useState([]);
    const [selectedPet, setSelectedPet] = useState(null);
    const [itemFilter, setItemFilter] = useState('');
    const [itemDraft, setItemDraft] = useState({ catalog_item_id: '', cantidad: '1' });

    const form = useForm({
        pet_id: '',
        vigencia_dias: '30',
        descuento_tipo: '',
        descuento_valor: '',
        items: [],
    });

    async function searchPet(q) {
        setPetSearch(q);
        if (q.length < 2) { setPetResults([]); return; }
        const r = await axios.get(route('owners.index'), { params: { search: q }, headers: { 'X-Inertia': true, 'X-Inertia-Version': version } });
        const owners = r.data?.props?.owners?.data ?? [];
        const pets = owners.flatMap(o => (o.pets ?? []).map(p => ({ id: p.id, nombre: p.nombre, owner: o.nombre_completo })));
        setPetResults(pets.slice(0, 8));
    }

    function selectPet(pet) {
        setSelectedPet(pet);
        setPetResults([]);
        form.setData('pet_id', pet.id);
    }

    const filteredCatalog = itemFilter.length >= 2
        ? catalogItems.filter(c => c.nombre.toLowerCase().includes(itemFilter.toLowerCase()))
        : catalogItems;

    function addItem() {
        const found = catalogItems.find(c => String(c.id) === itemDraft.catalog_item_id);
        if (!found) return;
        form.setData('items', [...form.data.items, {
            pos_catalog_item_id: found.id,
            nombre: found.nombre,
            precio: String(found.precio),
            cantidad: parseFloat(itemDraft.cantidad) || 1,
        }]);
        setItemDraft({ catalog_item_id: '', cantidad: '1' });
        setItemFilter('');
    }

    function removeItem(idx) {
        form.setData('items', form.data.items.filter((_, i) => i !== idx));
    }

    const subtotal = useMemo(
        () => form.data.items.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0),
        [form.data.items]
    );
    const descuentoMonto = form.data.descuento_tipo === 'monto'
        ? Number(form.data.descuento_valor || 0)
        : form.data.descuento_tipo === 'porcentaje'
            ? subtotal * Number(form.data.descuento_valor || 0) / 100
            : 0;
    const total = Math.max(0, subtotal - descuentoMonto);

    function submit(e) {
        e.preventDefault();
        form.post(route('packages.store'));
    }

    return (
        <TenantLayout title="Nuevo paquete">
            <div className="mb-4">
                <Link href={route('packages.index')} className="text-sm text-zinc-500 hover:text-zinc-700">← Paquetes</Link>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-zinc-700 text-sm">Mascota</h3>
                        <div className="relative">
                            <input className="w-full border-gray-300 rounded-lg text-sm py-1.5"
                                placeholder="Buscar mascota..."
                                value={selectedPet ? `${selectedPet.nombre} — ${selectedPet.owner}` : petSearch}
                                onChange={e => { setSelectedPet(null); form.setData('pet_id', ''); searchPet(e.target.value); }} />
                            {petResults.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                    {petResults.map(p => (
                                        <button key={p.id} type="button" onClick={() => selectPet(p)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors">
                                            <span className="font-medium">{p.nombre}</span>
                                            <span className="text-zinc-400 ml-2">{p.owner}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {form.errors.pet_id && <p className="text-rose-500 text-xs">{form.errors.pet_id}</p>}
                    </div>

                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-zinc-700 text-sm">Artículos del paquete</h3>

                        {form.data.items.length > 0 && (
                            <div className="divide-y border border-zinc-100 rounded-lg text-sm">
                                {form.data.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2">
                                        <span className="flex-1 text-zinc-800">{item.nombre}</span>
                                        <span className="text-zinc-500 text-xs whitespace-nowrap">{item.cantidad}× {fmt(item.precio)}</span>
                                        <span className="text-zinc-700 text-xs font-medium whitespace-nowrap w-20 text-right">{fmt(Number(item.precio) * Number(item.cantidad))}</span>
                                        <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600 transition-colors text-xs ml-1">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-8 relative">
                                <input className="w-full border-gray-300 rounded-lg text-sm"
                                    placeholder="Buscar artículo del catálogo..."
                                    value={itemDraft.catalog_item_id
                                        ? catalogItems.find(c => String(c.id) === itemDraft.catalog_item_id)?.nombre ?? ''
                                        : itemFilter}
                                    onChange={e => { setItemDraft(d => ({ ...d, catalog_item_id: '' })); setItemFilter(e.target.value); }} />
                                {itemFilter.length >= 2 && !itemDraft.catalog_item_id && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredCatalog.slice(0, 20).map(c => (
                                            <button key={c.id} type="button"
                                                onClick={() => { setItemDraft({ catalog_item_id: String(c.id), cantidad: '1' }); setItemFilter(''); }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors flex justify-between">
                                                <span>{c.nombre} <span className="text-zinc-400 text-xs">{c.categoria}</span></span>
                                                <span className="text-zinc-500">{fmt(c.precio)}</span>
                                            </button>
                                        ))}
                                        {filteredCatalog.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-zinc-400">Sin resultados.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input type="number" min="0.01" step="1" className="col-span-2 border-gray-300 rounded-lg text-sm"
                                value={itemDraft.cantidad} onChange={e => setItemDraft(d => ({ ...d, cantidad: e.target.value }))} />
                            <button type="button" onClick={addItem} disabled={!itemDraft.catalog_item_id}
                                className="col-span-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors">
                                Agregar
                            </button>
                        </div>
                        {form.errors.items && <p className="text-rose-500 text-xs">{form.errors.items}</p>}
                    </div>

                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-zinc-700 text-sm">Descuento (opcional)</h3>
                        <div className="flex items-center gap-2">
                            <select className="border-gray-300 rounded-lg text-sm"
                                value={form.data.descuento_tipo}
                                onChange={e => form.setData(d => ({ ...d, descuento_tipo: e.target.value, descuento_valor: e.target.value ? d.descuento_valor : '' }))}>
                                <option value="">Sin descuento</option>
                                <option value="monto">Monto fijo ($)</option>
                                <option value="porcentaje">Porcentaje (%)</option>
                            </select>
                            {form.data.descuento_tipo && (
                                <input type="number" min="0" step="0.01" className="border-gray-300 rounded-lg text-sm w-32"
                                    placeholder={form.data.descuento_tipo === 'porcentaje' ? '%' : '$'}
                                    value={form.data.descuento_valor}
                                    onChange={e => form.setData('descuento_valor', e.target.value)} />
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-zinc-700 text-sm">Vigencia</h3>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">Los créditos caducan a los (días) *</label>
                            <input type="number" min="1" max="365" className="w-32 border-gray-300 rounded-lg text-sm"
                                value={form.data.vigencia_dias} onChange={e => form.setData('vigencia_dias', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white border border-zinc-100 shadow-sm rounded-xl p-4 space-y-2 text-sm sticky top-4">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Resumen</h4>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Subtotal</span>
                            <span className="font-mono">{fmt(subtotal)}</span>
                        </div>
                        {descuentoMonto > 0 && (
                            <div className="flex justify-between text-rose-600">
                                <span>Descuento</span>
                                <span className="font-mono">− {fmt(descuentoMonto)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-semibold text-zinc-800 pt-2 border-t border-zinc-100">
                            <span>Total a cobrar</span>
                            <span className="font-mono">{fmt(total)}</span>
                        </div>
                        <button type="submit" disabled={form.processing || !form.data.pet_id || form.data.items.length === 0}
                            className="w-full mt-2 bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                            {form.processing ? 'Creando...' : 'Crear paquete y cobrar'}
                        </button>
                    </div>
                </div>
            </form>
        </TenantLayout>
    );
}
