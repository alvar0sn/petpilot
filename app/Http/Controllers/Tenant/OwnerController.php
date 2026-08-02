<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Jobs\SyncOwnerToGhl;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OwnerController extends Controller
{
    public function index(Request $request): Response
    {
        $owners = Owner::with([
                'pets:id,owner_id,nombre,tipo,foto_url,estado',
                'pets.memberships' => fn($q) => $q->where('activa', true)
                    ->with('credits:id,membership_id,servicio_tipo,saldo_actual'),
            ])
            ->when($request->search, function ($q, $s) {
                $sl = '%' . mb_strtolower($s) . '%';
                $q->where(fn($q) =>
                    $q->whereRaw('LOWER(nombre) LIKE ?', [$sl])
                      ->orWhereRaw('LOWER(apellidos) LIKE ?', [$sl])
                      ->orWhereRaw('LOWER(telefono) LIKE ?', [$sl])
                      ->orWhereRaw('LOWER(email) LIKE ?', [$sl])
                      ->orWhereHas('pets', fn($q) => $q->whereRaw('LOWER(nombre) LIKE ?', [$sl]))
                );
            })
            ->latest()
            ->paginate(30)
            ->withQueryString()
            ->through(fn($o) => [
                'id' => $o->id,
                'nombre' => $o->nombre,
                'apellidos' => $o->apellidos,
                'nombre_completo' => $o->nombre_completo,
                'telefono' => $o->telefono,
                'email' => $o->email,
                'direccion' => $o->direccion,
                'ghl_sync_status' => $o->ghl_sync_status,
                'pets_count' => $o->pets->count(),
                'pets' => $o->pets->take($request->search ? 20 : 3)->map(function ($p) {
                    $membership = $p->memberships->first();
                    $creditEst = $membership?->getCredit('estetica');
                    return [
                        'id'                => $p->id,
                        'nombre'            => $p->nombre,
                        'tipo'              => $p->tipo,
                        'membership_id'     => ($creditEst && $creditEst->saldo_actual > 0) ? $membership->id : null,
                        'creditos_estetica' => $creditEst?->saldo_actual ?? 0,
                    ];
                }),
                'created_at' => $o->created_at,
            ]);

        return Inertia::render('Owners/Index', [
            'owners' => $owners,
            'filters' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Owners/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'apellidos' => 'nullable|string|max:255',
            'telefono' => 'required|string|max:30|unique:owners,telefono',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:500',
            'notas' => 'nullable|string',
        ]);

        $owner = Owner::create($data + ['ghl_sync_status' => 'pending']);

        SyncOwnerToGhl::dispatch(currentTenantId(), $owner->id);

        return redirect()->route('owners.show', $owner)
            ->with('success', 'Cliente creado exitosamente.');
    }

    public function show(Owner $owner): Response
    {
        $owner->load([
            'pets'              => fn($q) => $q->withCount('events')->orderBy('estado')->orderBy('nombre'),
            'pets.memberships'  => fn($q) => $q->where('activa', true)->with('plan:id,nombre'),
        ]);

        $owner->pets->transform(function ($pet) {
            $pet->foto_url = $pet->foto_url
                ? Storage::disk(media_disk())->url($pet->foto_url)
                : null;
            return $pet;
        });

        return Inertia::render('Owners/Show', [
            'owner' => $owner,
        ]);
    }

    public function edit(Owner $owner): Response
    {
        $tenant = app()->bound('current_tenant') ? app('current_tenant') : null;
        return Inertia::render('Owners/Edit', [
            'owner' => $owner,
            'tenant' => $tenant ? ['slug' => $tenant->slug] : null,
        ]);
    }

    public function update(Request $request, Owner $owner): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'apellidos' => 'nullable|string|max:255',
            'telefono' => 'required|string|max:30|unique:owners,telefono,' . $owner->id,
            'email' => 'nullable|email|max:255',
            'portal_password' => 'nullable|string|min:6',
            'direccion' => 'nullable|string|max:500',
            'notas' => 'nullable|string',
        ]);

        if (!empty($data['portal_password'])) {
            $data['password'] = bcrypt($data['portal_password']);
        }
        unset($data['portal_password']);

        $owner->update($data + ['ghl_sync_status' => 'pending']);

        SyncOwnerToGhl::dispatch(currentTenantId(), $owner->id);

        return back()->with('success', 'Cliente actualizado.');
    }

    public function destroy(Owner $owner): RedirectResponse
    {
        $owner->delete();
        return redirect()->route('owners.index')->with('success', 'Cliente eliminado.');
    }

    public function importTemplate(): StreamedResponse
    {
        $headers = [
            'nombre', 'apellidos', 'telefono', 'email', 'direccion', 'notas',
            'mascota_nombre', 'mascota_tipo', 'mascota_raza', 'mascota_sexo',
            'mascota_fecha_nacimiento', 'mascota_peso', 'mascota_esterilizado',
        ];
        $rows = [
            ['Juan', 'García López', '5512345678', 'juan@email.com', 'Calle 123', 'Cliente frecuente', 'Firulais', 'perro', 'Labrador', 'macho', '2020-03-15', '12.5', 'si'],
            ['Juan', 'García López', '5512345678', '', '', '', 'Michi', 'gato', 'Siamés', 'hembra', '2021-07-01', '4', 'no'],
            ['María', 'López', '5598765432', 'maria@email.com', '', '', '', '', '', '', '', '', ''],
        ];

        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM para Excel
            fputcsv($out, $headers);
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, 'clientes-plantilla.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $path   = $request->file('archivo')->getRealPath();
        $handle = fopen($path, 'r');

        // Detectar y eliminar BOM si existe
        $bom = fread($handle, 3);
        if ($bom !== chr(0xEF) . chr(0xBB) . chr(0xBF)) {
            rewind($handle);
        }

        $rawHeaders = fgetcsv($handle);
        if (!$rawHeaders) {
            fclose($handle);
            return back()->withErrors(['archivo' => 'El archivo está vacío o no tiene encabezados.']);
        }
        $headers = array_map('trim', $rawHeaders);

        $imported = 0;
        $skipped  = 0;
        $pets     = 0;
        $errors   = [];
        $chunk    = [];
        $line     = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $line++;
            if (count($row) < count($headers)) continue;
            $chunk[] = ['line' => $line, 'data' => array_combine($headers, array_map('trim', $row))];

            if (count($chunk) >= 50) {
                [$i, $s, $p, $e] = $this->processImportChunk($chunk);
                $imported += $i; $skipped += $s; $pets += $p; $errors = array_merge($errors, $e);
                $chunk = [];
            }
        }
        if ($chunk) {
            [$i, $s, $p, $e] = $this->processImportChunk($chunk);
            $imported += $i; $skipped += $s; $pets += $p; $errors = array_merge($errors, $e);
        }
        fclose($handle);

        $msg = "Importación completada: {$imported} cliente(s) nuevo(s)";
        if ($pets)    $msg .= ", {$pets} mascota(s) registrada(s)";
        if ($skipped) $msg .= ", {$skipped} dueño(s) ya existían";

        return back()
            ->with('success', $msg)
            ->with('import_errors', array_slice($errors, 0, 20));
    }

    private function processImportChunk(array $rows): array
    {
        $imported = 0;
        $skipped  = 0;
        $pets     = 0;
        $errors   = [];

        DB::transaction(function () use ($rows, &$imported, &$skipped, &$pets, &$errors) {
            foreach ($rows as ['line' => $line, 'data' => $row]) {
                $nombre   = $row['nombre'] ?? '';
                $telefono = $row['telefono'] ?? '';

                if (!$nombre || !$telefono) {
                    $errors[] = "Línea {$line}: nombre y teléfono son obligatorios.";
                    continue;
                }

                $owner = Owner::where('telefono', $telefono)->first();

                if ($owner) {
                    $skipped++;
                } else {
                    $owner = Owner::create([
                        'nombre'          => $nombre,
                        'apellidos'       => $row['apellidos'] ?? null,
                        'telefono'        => $telefono,
                        'email'           => $row['email'] ?? null,
                        'direccion'       => $row['direccion'] ?? null,
                        'notas'           => $row['notas'] ?? null,
                        'ghl_sync_status' => 'pending',
                    ]);
                    $imported++;
                }

                // Crear mascota si viene mascota_nombre
                $petNombre = $row['mascota_nombre'] ?? '';
                if ($petNombre) {
                    $esterilizado = in_array(mb_strtolower($row['mascota_esterilizado'] ?? ''), ['si', 'sí', 'yes', '1', 'true']);
                    $fechaNac     = $row['mascota_fecha_nacimiento'] ?? '';
                    $peso         = $row['mascota_peso'] ?? '';

                    $str = fn(string $k) => ($row[$k] ?? '') !== '' ? $row[$k] : null;

                    \App\Models\Pet::create([
                        'owner_id'         => $owner->id,
                        'nombre'           => $petNombre,
                        'tipo'             => $str('mascota_tipo'),
                        'raza'             => $str('mascota_raza'),
                        'sexo'             => $str('mascota_sexo'),
                        'fecha_nacimiento' => $fechaNac ?: null,
                        'peso'             => is_numeric($peso) ? $peso : null,
                        'esterilizado'     => $esterilizado,
                        'estado'           => 'activo',
                    ]);
                    $pets++;
                }
            }
        });

        return [$imported, $skipped, $pets, $errors];
    }

    public function syncGhl(Owner $owner): RedirectResponse
    {
        $owner->update(['ghl_sync_status' => 'pending']);
        SyncOwnerToGhl::dispatch(currentTenantId(), $owner->id);
        return back()->with('success', 'Sync GHL iniciado.');
    }

    public function sendPortalAccess(Owner $owner): RedirectResponse
    {
        if (! $owner->email) {
            return back()->withErrors(['email' => 'Este cliente no tiene email registrado.']);
        }

        Password::broker('owners')->sendResetLink([
            'email' => $owner->email,
            'tenant_id' => $owner->tenant_id,
        ]);

        return back()->with('success', 'Correo de acceso al portal enviado a ' . $owner->email . '.');
    }
}
