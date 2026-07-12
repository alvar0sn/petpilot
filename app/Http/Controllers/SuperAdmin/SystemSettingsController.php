<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingsController extends Controller
{
    private const R2_KEYS = [
        'r2_key', 'r2_secret', 'r2_bucket', 'r2_account_id', 'r2_public_url',
    ];

    private const RESEND_KEYS = [
        'resend_api_key', 'resend_from_address', 'resend_from_name',
    ];

    public function index(): Response
    {
        $all = SystemSetting::many(array_merge(self::R2_KEYS, self::RESEND_KEYS));

        return Inertia::render('SuperAdmin/SystemSettings', [
            'r2'     => $this->pluck($all, self::R2_KEYS),
            'resend' => $this->pluck($all, self::RESEND_KEYS),
        ]);
    }

    public function updateR2(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'r2_key'        => 'nullable|string|max:255',
            'r2_secret'     => 'nullable|string|max:500',
            'r2_bucket'     => 'nullable|string|max:255',
            'r2_account_id' => 'nullable|string|max:255',
            'r2_public_url' => 'nullable|url|max:500',
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::set($key, $value ?? '');
        }

        return back()->with('success', 'Configuración de R2 guardada.');
    }

    public function testR2(Request $request): RedirectResponse
    {
        try {
            Storage::disk('r2')->put('_test/ping.txt', 'ok');
            Storage::disk('r2')->delete('_test/ping.txt');
            return back()->with('success', 'Conexión a R2 exitosa.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Error al conectar con R2: ' . $e->getMessage());
        }
    }

    public function updateResend(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'resend_api_key'      => 'nullable|string|max:500',
            'resend_from_address' => 'nullable|email|max:255',
            'resend_from_name'    => 'nullable|string|max:255',
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::set($key, $value ?? '');
        }

        return back()->with('success', 'Configuración de Resend guardada.');
    }

    private function pluck(array $all, array $keys): array
    {
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $all[$key] ?? null;
        }
        return $result;
    }
}
