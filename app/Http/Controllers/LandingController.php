<?php

namespace App\Http\Controllers;

use App\Models\MembershipPlan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class LandingController extends Controller
{
    public function show(string $slug): View
    {
        $tenant = Tenant::where('slug', $slug)
            ->where('estado', 'activo')
            ->firstOrFail();

        $cfg      = $tenant->getSetting('landing', []);
        $branding = $tenant->getSetting('branding', []);

        $equipo = collect();
        if (data_get($cfg, 'equipo.enabled', true)) {
            $selectedIds = data_get($cfg, 'equipo.selected_ids', []);
            $query = User::where('tenant_id', $tenant->id)
                ->whereIn('role', ['tenant_admin', 'colaborador'])
                ->where('activo', true)
                ->orderBy('nombre');
            if (!empty($selectedIds)) {
                $query->whereIn('id', $selectedIds);
            }
            $equipo = $query->get(['id', 'nombre', 'apellido']);
        }

        $planes = collect();
        if (data_get($cfg, 'membresias.enabled', true)) {
            $planes = MembershipPlan::where('tenant_id', $tenant->id)
                ->where('activo', true)
                ->orderBy('precio')
                ->get(['id', 'nombre', 'precio', 'vigencia_dias']);
        }

        return view('landing', compact('tenant', 'cfg', 'branding', 'equipo', 'planes'));
    }

    public function editor(): InertiaResponse
    {
        $tenant = app('current_tenant');
        $cfg      = $tenant->getSetting('landing', []);
        $branding = $tenant->getSetting('branding', []);

        $allStaff = User::where('tenant_id', $tenant->id)
            ->whereIn('role', ['tenant_admin', 'colaborador'])
            ->where('activo', true)
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'apellido']);

        $allPlanes = MembershipPlan::where('tenant_id', $tenant->id)
            ->where('activo', true)
            ->orderBy('precio')
            ->get(['id', 'nombre', 'precio']);

        return Inertia::render('Landing/Editor', [
            'tenant'    => ['nombre' => $tenant->nombre, 'slug' => $tenant->slug],
            'cfg'       => $cfg,
            'branding'  => $branding,
            'allStaff'  => $allStaff,
            'allPlanes' => $allPlanes,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $tenant = app('current_tenant');

        $branding = [
            'primary_color'   => $request->input('primary_color', '#1a56db'),
            'secondary_color' => $request->input('secondary_color', ''),
            'logo'            => $request->input('logo', ''),
        ];

        // Build servicios items from parallel arrays
        $servicios = [];
        foreach ($request->input('servicio_titulo', []) as $i => $titulo) {
            if (!empty($titulo)) {
                $servicios[] = [
                    'imagen' => $request->input("servicio_imagen.{$i}", ''),
                    'titulo' => $titulo,
                    'texto'  => $request->input("servicio_texto.{$i}", ''),
                ];
            }
        }

        $landing = [
            'hero' => [
                'show_name' => $request->boolean('hero_show_name'),
                'tagline'   => $request->input('hero_tagline', ''),
                'image'     => $request->input('hero_image', ''),
                'cta_text'  => $request->input('hero_cta_text', 'Contáctanos'),
            ],
            'about' => [
                'enabled' => $request->boolean('about_enabled'),
                'text'    => $request->input('about_text', ''),
                'image'   => $request->input('about_image', ''),
            ],
            'servicios' => [
                'enabled' => $request->boolean('servicios_enabled'),
                'title'   => $request->input('servicios_title', 'Nuestros servicios'),
                'items'   => $servicios,
            ],
            'equipo' => [
                'enabled'      => $request->boolean('equipo_enabled'),
                'selected_ids' => array_map('intval', $request->input('equipo_selected', [])),
            ],
            'beneficios' => [
                'enabled' => $request->boolean('beneficios_enabled'),
                'items'   => collect($request->input('beneficio_icono', []))->map(fn($icono, $i) => [
                    'icono'  => $icono,
                    'titulo' => $request->input("beneficio_titulo.{$i}", ''),
                    'texto'  => $request->input("beneficio_texto.{$i}", ''),
                ])->values()->toArray(),
            ],
            'membresias' => [
                'enabled' => $request->boolean('membresias_enabled'),
            ],
            'contacto' => [
                'address'   => $request->input('contacto_address', ''),
                'phone'     => $request->input('contacto_phone', ''),
                'whatsapp'  => $request->input('contacto_whatsapp', ''),
                'instagram' => ltrim($request->input('contacto_instagram', ''), '@'),
                'facebook'  => $this->ensureHttps($request->input('contacto_facebook', '')),
                'website'   => $this->ensureHttps($request->input('contacto_website', '')),
            ],
        ];

        $tenant->setSetting('branding', $branding);
        $tenant->setSetting('landing', $landing);

        return back()->with('success', 'Landing actualizada.');
    }

    private function ensureHttps(?string $url): string
    {
        if (empty($url)) return '';
        if (!Str::startsWith($url, ['http://', 'https://'])) {
            return 'https://' . $url;
        }
        return $url;
    }
}
