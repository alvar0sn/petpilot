<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\GhlContactLog;
use App\Models\GhlWebhookLog;
use App\Models\HotelStay;
use App\Models\Owner;
use App\Models\Pet;
use App\Models\PosTicket;
use App\Models\Tenant;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function __construct(private TenantService $tenantService) {}

    public function index(Request $request): Response
    {
        $search = $request->input('search', '');

        $tenants = Tenant::withCount(['owners', 'pets'])
            ->when($search, fn($q) => $q->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            }))
            ->latest()
            ->get()
            ->map(function ($tenant) {
                $ticketsMes = PosTicket::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->where('estado', 'pagado')
                    ->whereMonth('cobrado_at', now()->month)
                    ->count();

                $estanciasActivas = HotelStay::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->whereIn('estado', ['reservado', 'activo'])
                    ->count();

                return [
                    'id'               => $tenant->id,
                    'nombre'           => $tenant->nombre,
                    'slug'             => $tenant->slug,
                    'estado'           => $tenant->estado,
                    'plan_precio'      => $tenant->plan_precio,
                    'created_at'       => $tenant->created_at,
                    'owners_count'     => $tenant->owners_count,
                    'pets_count'       => $tenant->pets_count,
                    'tickets_mes'      => $ticketsMes,
                    'estancias_activas'=> $estanciasActivas,
                ];
            });

        return Inertia::render('SuperAdmin/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('SuperAdmin/Tenants/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'slug' => 'required|string|max:63|unique:tenants,slug|regex:/^[a-z0-9-]+$/',
            'estado' => 'required|in:activo,inactivo,trial',
            'plan_precio' => 'nullable|string|max:255',
            'admin_nombre' => 'required|string|max:255',
            'admin_apellido' => 'nullable|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => ['required', Password::min(8)],
            'ghl_api_key' => 'nullable|string',
            'ghl_location_id' => 'nullable|string|max:255',
            'notas_internas' => 'nullable|string',
        ]);

        $tenant = $this->tenantService->create($request->all());

        return redirect()->route('super-admin.tenants.show', $tenant)
            ->with('success', "Tenant {$tenant->nombre} creado exitosamente.");
    }

    public function show(Tenant $tenant): Response
    {
        $tenant->load(['ghlConfig', 'users' => function ($query) {
            $query->orderByRaw("CASE role WHEN 'tenant_admin' THEN 0 ELSE 1 END")->orderBy('nombre');
        }]);

        $ghlContactLogs = GhlContactLog::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->latest('created_at')
            ->limit(20)
            ->get();

        $ghlWebhookLogs = GhlWebhookLog::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->latest('created_at')
            ->limit(20)
            ->get();

        $stats = [
            'owners' => Owner::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count(),
            'pets' => Pet::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count(),
            'tickets_mes' => PosTicket::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('estado', 'pagado')
                ->whereMonth('cobrado_at', now()->month)
                ->count(),
            'estancias_activas' => HotelStay::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->whereIn('estado', ['reservado', 'activo'])
                ->count(),
        ];

        return Inertia::render('SuperAdmin/Tenants/Show', [
            'tenant' => $tenant,
            'stats' => $stats,
            'ghlContactLogs' => $ghlContactLogs,
            'ghlWebhookLogs' => $ghlWebhookLogs,
        ]);
    }

    public function update(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'slug' => 'required|string|max:63|unique:tenants,slug,' . $tenant->id . '|regex:/^[a-z0-9-]+$/',
            'timezone' => 'required|timezone:all',
            'estado' => 'required|in:activo,inactivo,trial',
            'plan_precio' => 'nullable|string|max:255',
            'notas_internas' => 'nullable|string',
        ]);

        $tenant->update($request->only('nombre', 'slug', 'timezone', 'estado', 'plan_precio', 'notas_internas'));

        return back()->with('success', 'Tenant actualizado.');
    }

    public function updateGhl(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->validate([
            'api_key' => 'nullable|string',
            'location_id' => 'nullable|string|max:255',
            'webhook_recordatorios' => 'nullable|url|max:500',
            'webhook_cumpleanos' => 'nullable|url|max:500',
            'webhook_reviews' => 'nullable|url|max:500',
            'webhook_membresia_vencimiento' => 'nullable|url|max:500',
            'webhook_checkin_hotel' => 'nullable|url|max:500',
            'webhook_checkout_hotel' => 'nullable|url|max:500',
            'webhook_whatsapp_pos' => 'nullable|url|max:500',
            'activo' => 'boolean',
        ]);

        $this->tenantService->updateGhl($tenant, $request->all());

        return back()->with('success', 'Configuración GHL actualizada.');
    }

    public function testWebhook(Request $request, Tenant $tenant): JsonResponse
    {
        $allowed = [
            'webhook_recordatorios',
            'webhook_cumpleanos',
            'webhook_reviews',
            'webhook_membresia_vencimiento',
            'webhook_checkin_hotel',
            'webhook_checkout_hotel',
            'webhook_whatsapp_pos',
        ];

        $data = $request->validate([
            'webhook_type' => 'required|string|in:' . implode(',', $allowed),
        ]);

        $tenant->load('ghlConfig');
        $url = $tenant->ghlConfig?->{$data['webhook_type']};

        if (!$url) {
            return response()->json(['ok' => false, 'error' => 'URL no configurada.'], 422);
        }

        $testPayloads = [
            'webhook_recordatorios' => [
                'tipo'    => 'recordatorio',
                'mascota' => 'Firulais',
                'dueno'   => 'Juan Pérez',
                'phone'   => '+525512345678',
                'email'   => 'test@ejemplo.com',
                'fecha'   => now()->addDays(7)->toDateString(),
                'mensaje' => 'Recordatorio de vacuna próxima',
            ],
            'webhook_cumpleanos' => [
                'tipo'    => 'cumpleanos',
                'mascota' => 'Firulais',
                'dueno'   => 'Juan Pérez',
                'phone'   => '+525512345678',
                'email'   => 'test@ejemplo.com',
                'fecha'   => now()->toDateString(),
                'mensaje' => '¡Hoy es el cumpleaños de Firulais! 🎂',
            ],
            'webhook_reviews' => [
                'tipo'    => 'review',
                'dueno'   => 'Juan Pérez',
                'phone'   => '+525512345678',
                'email'   => 'test@ejemplo.com',
                'mensaje' => 'Gracias por tu visita, ¿nos dejas una reseña?',
            ],
            'webhook_membresia_vencimiento' => [
                'tipo'         => 'membresia_vencimiento',
                'dueno'        => 'Juan Pérez',
                'phone'        => '+525512345678',
                'email'        => 'test@ejemplo.com',
                'plan'         => 'Plan Premium',
                'vencimiento'  => now()->addDays(5)->toDateString(),
                'mensaje'      => 'Tu membresía vence en 5 días.',
            ],
            'webhook_checkin_hotel' => [
                'tipo'          => 'checkin_hotel',
                'mascota'       => 'Firulais',
                'dueno'         => 'Juan Pérez',
                'phone'         => '+525512345678',
                'email'         => 'test@ejemplo.com',
                'fecha_entrada' => now()->toDateString(),
                'fecha_salida'  => now()->addDays(3)->toDateString(),
                'mensaje'       => 'Check-in de Firulais en el hotel.',
            ],
            'webhook_checkout_hotel' => [
                'tipo'         => 'checkout_hotel',
                'mascota'      => 'Firulais',
                'dueno'        => 'Juan Pérez',
                'phone'        => '+525512345678',
                'email'        => 'test@ejemplo.com',
                'fecha_salida' => now()->toDateString(),
                'mensaje'      => 'Firulais ya puede ser recogido.',
            ],
            'webhook_whatsapp_pos' => [
                'phone'     => '+525512345678',
                'message'   => "🧾 *Ticket #TEST*\n\n• Servicio de prueba ×1  $100.00\n\n💰 *Total: $100.00*\n\n¡Gracias por su visita! 🐾",
                'ticket_id' => 0,
            ],
        ];

        $payload = array_merge(
            $testPayloads[$data['webhook_type']] ?? [],
            ['_test' => true, '_tenant' => $tenant->nombre]
        );

        try {
            $response = Http::timeout(10)->post($url, $payload);
            return response()->json([
                'ok'     => $response->successful(),
                'status' => $response->status(),
                'body'   => substr($response->body(), 0, 300),
            ]);
        } catch (\Exception $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function toggle(Tenant $tenant): RedirectResponse
    {
        $tenant->update([
            'estado' => $tenant->estado === 'activo' ? 'inactivo' : 'activo',
        ]);

        return back()->with('success', 'Estado del tenant actualizado.');
    }

    public function destroy(Tenant $tenant): RedirectResponse
    {
        $tenant->delete();
        return redirect()->route('super-admin.index')->with('success', 'Tenant eliminado.');
    }
}
