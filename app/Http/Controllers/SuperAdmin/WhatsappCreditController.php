<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Services\WhatsappCreditCheckout;
use App\Services\WhatsappCreditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappCreditController extends Controller
{
    public function index(): Response
    {
        $tenants = Tenant::orderBy('nombre')->get([
            'id', 'nombre', 'whatsapp_free_credits', 'whatsapp_purchased_credits',
            'whatsapp_free_credits_monthly', 'whatsapp_credits_reset_at',
        ]);

        return Inertia::render('SuperAdmin/WhatsappCredits/Index', [
            'tenants' => $tenants,
            'settings' => [
                'whatsapp_free_credits_default' => (int) SystemSetting::get('whatsapp_free_credits_default', 1000),
                'whatsapp_recharge_credits' => WhatsappCreditCheckout::creditsPerPack(),
                'whatsapp_recharge_price' => WhatsappCreditCheckout::pricePerPack(),
            ],
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'whatsapp_free_credits_default' => 'required|integer|min:0',
            'whatsapp_recharge_credits' => 'required|integer|min:1',
            'whatsapp_recharge_price' => 'required|numeric|min:0.01',
        ]);

        foreach ($validated as $key => $value) {
            SystemSetting::set($key, $value);
        }

        return back()->with('success', 'Configuración de créditos actualizada.');
    }

    public function updateOverride(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'whatsapp_free_credits_monthly' => 'nullable|integer|min:0',
        ]);

        $tenant->update(['whatsapp_free_credits_monthly' => $validated['whatsapp_free_credits_monthly'] ?? null]);

        return back()->with('success', "Default mensual de {$tenant->nombre} actualizado.");
    }

    public function adjust(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'delta' => 'required|integer|not_in:0',
        ]);

        try {
            WhatsappCreditService::adjustFree($tenant, $validated['delta']);
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['delta' => $e->getMessage()]);
        }

        $sign = $validated['delta'] > 0 ? '+' : '';
        return back()->with('success', "Ajuste de {$sign}{$validated['delta']} créditos aplicado a {$tenant->nombre}.");
    }
}
