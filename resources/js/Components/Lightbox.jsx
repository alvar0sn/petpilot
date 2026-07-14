import { useEffect } from 'react';

export default function Lightbox({ photos, index, onClose, onPrev, onNext }) {
    const photo = photos[index];

    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && index < photos.length - 1) onNext();
            if (e.key === 'ArrowLeft'  && index > 0)                  onPrev();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [index, photos.length]);

    if (!photo) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
             onClick={onClose}>

            {/* Prev */}
            {index > 0 && (
                <button onClick={e => { e.stopPropagation(); onPrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors">
                    ‹
                </button>
            )}

            {/* Image */}
            <div onClick={e => e.stopPropagation()} className="max-w-4xl max-h-[90vh] w-full mx-16 flex flex-col items-center gap-3">
                <img src={photo.url} alt={photo.descripcion ?? photo.etiqueta ?? ''}
                     className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl" />
                {(photo.descripcion || photo.etiqueta) && (
                    <p className="text-white/80 text-sm text-center">{photo.descripcion ?? photo.etiqueta}</p>
                )}
                <p className="text-white/40 text-xs">{index + 1} / {photos.length}</p>
            </div>

            {/* Next */}
            {index < photos.length - 1 && (
                <button onClick={e => { e.stopPropagation(); onNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors">
                    ›
                </button>
            )}

            {/* Close */}
            <button onClick={onClose}
                className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/70 rounded-full w-9 h-9 flex items-center justify-center text-lg transition-colors">
                ×
            </button>
        </div>
    );
}
