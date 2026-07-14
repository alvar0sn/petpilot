<?php

if (!function_exists('media_disk')) {
    function media_disk(): string
    {
        return app()->bound('media_disk') ? app('media_disk') : 'public';
    }
}
