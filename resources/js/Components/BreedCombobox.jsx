import { useState, useRef, useEffect } from 'react';

const RAZAS_POR_ESPECIE = {
    perro: [
        'Affenpinscher', 'Afgano', 'Airedale Terrier', 'Akita', 'Alaskan Malamute',
        'American Bully', 'Australian Shepherd', 'Basenji', 'Basset Hound', 'Beagle',
        'Bedlington Terrier', 'Belgian Malinois', 'Bernese Mountain Dog', 'Bichón Frisé',
        'Bloodhound', 'Border Collie', 'Border Terrier', 'Boston Terrier', 'Boxer',
        'Bull Terrier', 'Bulldog Americano', 'Bulldog Francés', 'Bulldog Inglés',
        'Cairn Terrier', 'Cane Corso', 'Caniche (Poodle)', 'Cavalier King Charles Spaniel',
        'Chihuahua', 'Chow Chow', 'Cocker Spaniel Americano', 'Cocker Spaniel Inglés',
        'Criollo', 'Dachshund (Salchicha)', 'Dálmata', 'Doberman',
        'English Springer Spaniel', 'Eurasier', 'Fox Terrier', 'Galgo', 'Gran Danés',
        'Golden Retriever', 'Greyhound', 'Husky Siberiano', 'Irish Setter',
        'Italian Greyhound', 'Jack Russell Terrier', 'Keeshond', 'Labrador Retriever',
        'Lhasa Apso', 'Maltés', 'Mastín Napolitano', 'Mastín Tibetano',
        'Miniature Schnauzer', 'Papillón', 'Pastor Alemán', 'Pastor Australiano',
        'Pastor Belga', 'Pekinés', 'Pembroke Welsh Corgi', 'Pitbull',
        'Pointer', 'Pomerania', 'Pug (Carlino)', 'Rhodesian Ridgeback', 'Rottweiler',
        'Saluki', 'Samoyedo', 'Schnauzer Gigante', 'Schnauzer Mediano', 'Shar Pei',
        'Shetland Sheepdog', 'Shih Tzu', 'Soft Coated Wheaten Terrier',
        'Spitz Alemán', 'Staffordshire Bull Terrier', 'Vizsla',
        'Weimaraner', 'West Highland White Terrier', 'Whippet', 'Yorkshire Terrier',
    ],
    gato: [
        'Abisinio', 'Azul Ruso', 'Bengalí', 'Birmano', 'British Longhair',
        'British Shorthair', 'Burmés', 'Cornish Rex', 'Criollo', 'Devon Rex',
        'Esfinge (Sphinx)', 'Exótico de Pelo Corto', 'Himalayo', 'Maine Coon',
        'Manx', 'Munchkin', 'Noruego del Bosque', 'Persa', 'Ragdoll',
        'Savannah', 'Scottish Fold', 'Selkirk Rex', 'Siamés', 'Siberiano',
        'Singapura', 'Somalí', 'Tonkinés', 'Turco Angora', 'Turco Van',
    ],
    roedor: [
        'Chinchilla', 'Cobayo (Cuy)', 'Conejo Angora', 'Conejo Belier',
        'Conejo Enano', 'Conejo Holland Lop', 'Conejo Mini Rex', 'Conejo Rex',
        'Degú', 'Erizo Africano', 'Gerbil (Jerbo)', 'Hámster Chino',
        'Hámster Dorado', 'Hámster Roborovski', 'Hámster Ruso',
        'Jerbo de Mongolia', 'Rata Fancy', 'Ratón Fancy',
    ],
    reptil: [
        'Boa Constrictor', 'Camaleón de Velo', 'Camaleón Pantera',
        'Dragón Barbudo (Bearded Dragon)', 'Gecko Crestado', 'Gecko Leopardo',
        'Iguana Verde', 'Lagarto Monitor', 'Pitón Ball', 'Pitón Bola Piebald',
        'Serpiente del Maíz', 'Serpiente Rey', 'Tortuga Box',
        'Tortuga de Agua (Trachemys)', 'Tortuga Griega', 'Tortuga Sulcata',
        'Tortuga Estrella', 'Varano (Monitor)',
    ],
    otro: [],
};

export default function BreedCombobox({ value, onChange, tipo = 'perro', razasCustom = [] }) {
    const [query, setQuery]   = useState(value ?? '');
    const [open, setOpen]     = useState(false);
    const containerRef        = useRef(null);

    const baseList = RAZAS_POR_ESPECIE[tipo] ?? [];
    const customFiltered = razasCustom
        .filter(r => r.tipo === tipo)
        .map(r => r.nombre);

    const allRazas = [...new Set([...baseList, ...customFiltered])].sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    const suggestions = query.length >= 3
        ? allRazas.filter(r => r.toLowerCase().includes(query.toLowerCase()))
        : [];

    useEffect(() => {
        function handleClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function handleChange(e) {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        setOpen(true);
    }

    function select(raza) {
        setQuery(raza);
        onChange(raza);
        setOpen(false);
    }

    if (allRazas.length === 0) {
        return (
            <input
                type="text"
                className="w-full border-gray-300 rounded-lg text-sm"
                value={query}
                onChange={handleChange}
            />
        );
    }

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                className="w-full border-gray-300 rounded-lg text-sm"
                value={query}
                placeholder="Escribe 3 letras para buscar…"
                onChange={handleChange}
                onFocus={() => setOpen(true)}
                autoComplete="off"
            />
            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm">
                    {suggestions.map(r => (
                        <li key={r}
                            onMouseDown={() => select(r)}
                            className="px-3 py-2 cursor-pointer hover:bg-zinc-50 text-zinc-700">
                            {r}
                        </li>
                    ))}
                </ul>
            )}
            {query.length > 0 && query.length < 3 && (
                <p className="text-xs text-zinc-400 mt-0.5">
                    Escribe {3 - query.length} letra{3 - query.length !== 1 ? 's' : ''} más para ver sugerencias
                </p>
            )}
        </div>
    );
}
