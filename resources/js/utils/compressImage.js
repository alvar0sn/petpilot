import imageCompression from 'browser-image-compression';

const OPTIONS = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
};

export async function compressImage(file) {
    if (!file || !file.type.startsWith('image/')) return file;
    try {
        return await imageCompression(file, OPTIONS);
    } catch {
        return file;
    }
}
