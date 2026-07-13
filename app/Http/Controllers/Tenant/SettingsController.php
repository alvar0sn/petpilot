<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\ChecklistItem;
use App\Models\GroomingStation;
use App\Models\PosCategory;
use App\Models\PosCatalogItem;
use App\Models\PosPaymentMethod;
use App\Models\PosTicketConfig;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        $categories = PosCategory::orderBy('orden')->get();
        $items = PosCatalogItem::with('categoria:id,nombre')->orderBy('nombre')->get();
        $paymentMethods = PosPaymentMethod::orderBy('orden')->get();

        $ticketConfig = PosTicketConfig::first();

        return Inertia::render('Settings/Index', [
            'categories'    => $categories,
            'items'         => $items,
            'paymentMethods'=> $paymentMethods,
            'stations'      => GroomingStation::orderBy('orden')->orderBy('nombre')->get(['id', 'nombre', 'activo', 'orden']),
            'checklistItems'=> ChecklistItem::orderBy('orden')->orderBy('nombre')->get(['id', 'nombre', 'activo', 'orden']),
            'ticketConfig'  => [
                'logo_url'       => $ticketConfig?->logo_path ? Storage::url($ticketConfig->logo_path) : null,
                'color_primario' => $ticketConfig?->color_primario ?? '#4f46e5',
                'color_texto'    => $ticketConfig?->color_texto    ?? '#1f2937',
                'color_fondo'    => $ticketConfig?->color_fondo    ?? '#ffffff',
                'mensaje_pie'    => $ticketConfig?->mensaje_pie    ?? '',
            ],
            'walkConfig' => [
                'horas_anticipacion' => (int) (app('current_tenant')->getSetting('paseos.horas_anticipacion') ?? 2),
                'dias_adelante'      => (int) (app('current_tenant')->getSetting('paseos.dias_adelante') ?? 14),
            ],
            'teamMembers' => User::where('tenant_id', app('current_tenant')->id)
                ->whereIn('role', ['tenant_admin', 'colaborador'])
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'apellido', 'email', 'role', 'activo', 'permisos_modulos']),
        ]);
    }

    public function storeTeamMember(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre'            => 'required|string|max:255',
            'apellido'          => 'nullable|string|max:255',
            'email'             => 'required|email|unique:users,email',
            'role'              => 'required|in:tenant_admin,colaborador',
            'password'          => ['required', Password::min(8)],
            'permisos_modulos'  => 'nullable|array',
            'permisos_modulos.*'=> 'in:crm,pos,memberships,hotel,paseos,grooming,veterinaria',
        ]);

        app('current_tenant')->users()->create([
            'nombre'           => $data['nombre'],
            'apellido'         => $data['apellido'] ?? null,
            'email'            => $data['email'],
            'role'             => $data['role'],
            'password'         => Hash::make($data['password']),
            'activo'           => true,
            'permisos_modulos' => $data['role'] === 'colaborador' ? ($data['permisos_modulos'] ?? null) : null,
        ]);

        return back()->with('success', 'Usuario creado.');
    }

    public function updateTeamMember(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === app('current_tenant')->id, 404);

        $data = $request->validate([
            'nombre'            => 'required|string|max:255',
            'apellido'          => 'nullable|string|max:255',
            'email'             => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role'              => 'required|in:tenant_admin,colaborador',
            'activo'            => 'boolean',
            'permisos_modulos'  => 'nullable|array',
            'permisos_modulos.*'=> 'in:crm,pos,memberships,hotel,paseos,grooming,veterinaria',
        ]);

        if (! ($data['activo'] ?? true) || $data['role'] !== 'tenant_admin') {
            $this->guardLastTenantAdmin($user);
        }

        $user->update([
            ...$data,
            'permisos_modulos' => $data['role'] === 'colaborador' ? ($data['permisos_modulos'] ?? null) : null,
        ]);

        return back()->with('success', 'Usuario actualizado.');
    }

    public function updateTeamMemberPassword(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === app('current_tenant')->id, 404);

        $request->validate([
            'password' => ['required', Password::min(8)],
        ]);

        $user->update(['password' => Hash::make($request->password)]);

        return back()->with('success', 'Contraseña actualizada.');
    }

    public function destroyTeamMember(User $user): RedirectResponse
    {
        abort_unless($user->tenant_id === app('current_tenant')->id, 404);
        abort_if($user->id === auth()->id(), 422, 'No puedes eliminar tu propia cuenta.');

        if ($user->role === 'tenant_admin') {
            $this->guardLastTenantAdmin($user);
        }

        $user->delete();

        return back()->with('success', 'Usuario eliminado.');
    }

    private function guardLastTenantAdmin(User $user): void
    {
        $remainingAdmins = User::where('tenant_id', app('current_tenant')->id)
            ->where('role', 'tenant_admin')
            ->where('activo', true)
            ->where('id', '!=', $user->id)
            ->count();

        abort_if($remainingAdmins === 0, 422, 'Debe quedar al menos un administrador activo.');
    }

    public function updateTicketConfig(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'logo'           => 'nullable|image|max:2048',
            'color_primario' => 'required|string|max:20',
            'color_texto'    => 'required|string|max:20',
            'color_fondo'    => 'required|string|max:20',
            'mensaje_pie'    => 'nullable|string|max:500',
        ]);

        $config = PosTicketConfig::firstOrNew([]);

        if ($request->hasFile('logo')) {
            if ($config->logo_path) {
                Storage::disk('public')->delete($config->logo_path);
            }
            $config->logo_path = $request->file('logo')->store(
                'ticket-logos/' . currentTenant()->id,
                'public'
            );
        }

        $config->fill([
            'color_primario' => $data['color_primario'],
            'color_texto'    => $data['color_texto'],
            'color_fondo'    => $data['color_fondo'],
            'mensaje_pie'    => $data['mensaje_pie'] ?? null,
        ]);
        $config->save();

        return back()->with('success', 'Configuración de ticket actualizada.');
    }

    public function catalogSample(): HttpResponse
    {
        $rows = [
            ['categoria', 'nombre', 'tipo', 'precio', 'costo', 'sku', 'stock'],
            ['General',    'Consulta básica',      'servicio', '350', '0',  '',      ''],
            ['General',    'Shampoo medicado',     'producto', '120', '80', 'SH001', '10'],
            ['Grooming',   'Baño y corte pequeño', 'servicio', '350', '0',  '',      ''],
            ['Grooming',   'Baño y corte mediano', 'servicio', '450', '0',  '',      ''],
            ['Membresías', 'Plan mensual 4 baños', 'servicio', '999', '0',  '',      ''],
        ];

        $csv = implode("\n", array_map(fn($r) => implode(',', array_map(fn($v) => '"' . str_replace('"', '""', $v) . '"', $r)), $rows));

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="catalogo_ejemplo.csv"',
        ]);
    }

    public function importCatalog(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $path    = $request->file('file')->getRealPath();
        $handle  = fopen($path, 'r');
        $headers = array_map('trim', fgetcsv($handle) ?: []);

        $required = ['categoria', 'nombre', 'tipo', 'precio'];
        foreach ($required as $col) {
            if (!in_array($col, $headers)) {
                fclose($handle);
                return response()->json(['error' => "Columna requerida faltante: {$col}"], 422);
            }
        }

        $idx = array_flip($headers);
        $created = 0;
        $errors  = [];
        $row     = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $row++;
            $get = fn(string $col) => isset($idx[$col]) ? trim($data[$idx[$col]] ?? '') : '';

            $catNombre = $get('categoria');
            $nombre    = $get('nombre');
            $tipo      = $get('tipo');
            $precio    = $get('precio');

            if (!$catNombre || !$nombre || !$tipo || $precio === '') {
                $errors[] = "Fila {$row}: campos requeridos vacíos.";
                continue;
            }

            if (!in_array($tipo, ['producto', 'servicio'])) {
                $errors[] = "Fila {$row}: tipo '{$tipo}' inválido (debe ser producto o servicio).";
                continue;
            }

            if (!is_numeric($precio) || (float) $precio < 0) {
                $errors[] = "Fila {$row}: precio inválido.";
                continue;
            }

            $categoria = PosCategory::firstOrCreate(
                ['nombre' => $catNombre],
                ['activo' => true, 'orden' => (int) PosCategory::max('orden') + 1]
            );

            PosCatalogItem::create([
                'categoria_id' => $categoria->id,
                'nombre'       => $nombre,
                'tipo'         => $tipo,
                'precio'       => (float) $precio,
                'costo'        => is_numeric($get('costo')) ? (float) $get('costo') : 0,
                'sku'          => $get('sku') ?: null,
                'stock'        => is_numeric($get('stock')) ? (int) $get('stock') : 0,
                'activo'       => true,
            ]);

            $created++;
        }

        fclose($handle);

        return response()->json([
            'created' => $created,
            'errors'  => $errors,
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'orden' => 'nullable|integer',
            'es_grooming' => 'boolean',
        ]);

        $data['orden'] ??= (int) PosCategory::max('orden') + 1;

        PosCategory::create($data + ['activo' => true]);
        return back()->with('success', 'Categoría creada.');
    }

    public function updateCategory(Request $request, PosCategory $category): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'orden' => 'nullable|integer',
            'activo' => 'boolean',
            'es_grooming' => 'boolean',
        ]);

        $category->update($data);
        return back()->with('success', 'Categoría actualizada.');
    }

    public function destroyCategory(PosCategory $category): RedirectResponse
    {
        $category->delete();
        return back()->with('success', 'Categoría eliminada.');
    }

    public function storeItem(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'categoria_id' => 'required|exists:pos_categories,id',
            'sku' => 'nullable|string|max:50',
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:producto,servicio',
            'precio' => 'required|numeric|min:0',
            'costo' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
        ]);

        $data['costo'] = $data['costo'] ?? 0;
        $data['stock'] = $data['stock'] ?? 0;
        PosCatalogItem::create($data + ['activo' => true]);
        return back()->with('success', 'Artículo creado.');
    }

    public function updateItem(Request $request, PosCatalogItem $item): RedirectResponse
    {
        $data = $request->validate([
            'categoria_id' => 'required|exists:pos_categories,id',
            'sku' => 'nullable|string|max:50',
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:producto,servicio',
            'precio' => 'required|numeric|min:0',
            'costo' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'activo' => 'boolean',
        ]);

        $item->update($data);
        return back()->with('success', 'Artículo actualizado.');
    }

    public function destroyItem(PosCatalogItem $item): RedirectResponse
    {
        $item->delete();
        return back()->with('success', 'Artículo eliminado.');
    }

    public function storePaymentMethod(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'orden' => 'nullable|integer',
        ]);

        $data['orden'] ??= (int) PosPaymentMethod::max('orden') + 1;

        PosPaymentMethod::create($data + ['activo' => true]);
        return back()->with('success', 'Método de pago creado.');
    }

    public function updatePaymentMethod(Request $request, PosPaymentMethod $method): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'orden' => 'nullable|integer',
            'activo' => 'boolean',
        ]);

        $method->update($data);
        return back()->with('success', 'Método de pago actualizado.');
    }

    public function destroyPaymentMethod(PosPaymentMethod $method): RedirectResponse
    {
        $method->delete();
        return back()->with('success', 'Método de pago eliminado.');
    }

    public function storeChecklistItem(Request $request): RedirectResponse
    {
        $data = $request->validate(['nombre' => 'required|string|max:100', 'orden' => 'nullable|integer']);
        $data['orden'] ??= (int) ChecklistItem::max('orden') + 1;
        ChecklistItem::create($data + ['activo' => true]);
        return back()->with('success', 'Ítem creado.');
    }

    public function updateChecklistItem(Request $request, ChecklistItem $checklistItem): RedirectResponse
    {
        $data = $request->validate(['nombre' => 'required|string|max:100', 'orden' => 'nullable|integer', 'activo' => 'boolean']);
        $checklistItem->update($data);
        return back()->with('success', 'Ítem actualizado.');
    }

    public function destroyChecklistItem(ChecklistItem $checklistItem): RedirectResponse
    {
        $checklistItem->delete();
        return back()->with('success', 'Ítem eliminado.');
    }

    public function storeStation(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'orden' => 'nullable|integer',
        ]);

        $data['orden'] ??= (int) GroomingStation::max('orden') + 1;

        GroomingStation::create($data + ['activo' => true]);
        return back()->with('success', 'Estación creada.');
    }

    public function updateStation(Request $request, GroomingStation $station): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:100',
            'orden' => 'nullable|integer',
            'activo' => 'boolean',
        ]);

        $station->update($data);
        return back()->with('success', 'Estación actualizada.');
    }

    public function destroyStation(GroomingStation $station): RedirectResponse
    {
        $station->delete();
        return back()->with('success', 'Estación eliminada.');
    }

    public function updateWalkConfig(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'horas_anticipacion' => 'required|integer|min:0|max:72',
            'dias_adelante'      => 'required|integer|min:1|max:90',
        ]);

        $tenant = app('current_tenant');
        $tenant->setSetting('paseos.horas_anticipacion', $data['horas_anticipacion']);
        $tenant->setSetting('paseos.dias_adelante',      $data['dias_adelante']);

        return back()->with('success', 'Configuración de paseos guardada.');
    }
}
