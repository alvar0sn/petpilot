<?php

use Illuminate\Support\Facades\Storage;

if (!function_exists('media_disk')) {
    function media_disk(): string
    {
        return app()->bound('media_disk') ? app('media_disk') : 'public';
    }
}

if (!function_exists('media_url')) {
    /**
     * URL para un archivo en el disco de media. En R2 el bucket es privado,
     * así que se genera una URL firmada temporal; en el disco local (fallback
     * sin R2 configurado) se usa la URL pública normal, que no expira.
     */
    function media_url(?string $path, int $minutes = 60): ?string
    {
        if (!$path) {
            return null;
        }

        $disk = Storage::disk(media_disk());

        return media_disk() === 'r2'
            ? $disk->temporaryUrl($path, now()->addMinutes($minutes))
            : $disk->url($path);
    }
}
