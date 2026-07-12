<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CsvImportController extends Controller
{
    public function show(Tenant $tenant): Response
    {
        return Inertia::render('SuperAdmin/Import', ['tenant' => $tenant]);
    }

    public function preview(Request $request, Tenant $tenant): \Illuminate\Http\JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:10240']);

        $rows = $this->parseCsv($request->file('file')->getRealPath());
        $preview = $this->buildPreview($rows, $tenant->id);

        return response()->json($preview);
    }

    public function confirm(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:10240']);

        $rows = $this->parseCsv($request->file('file')->getRealPath());
        $result = $this->importRows($rows, $tenant->id);

        return back()->with('success', "Importación completa: {$result['imported']} nuevos, {$result['skipped']} duplicados, {$result['errors']} errores.");
    }

    private function parseCsv(string $path): array
    {
        $rows = [];
        if (($handle = fopen($path, 'r')) === false) {
            return $rows;
        }

        $headers = null;
        while (($line = fgetcsv($handle)) !== false) {
            if ($headers === null) {
                $headers = array_map('strtolower', array_map('trim', $line));
                continue;
            }
            if (count($line) === count($headers)) {
                $rows[] = array_combine($headers, $line);
            }
        }

        fclose($handle);
        return $rows;
    }

    private function buildPreview(array $rows, int $tenantId): array
    {
        $new = $skipped = $errors = [];

        foreach ($rows as $row) {
            try {
                $telefono = $this->normalizePhone($row['telefono'] ?? $row['phone'] ?? '');
                $nombre = trim($row['nombre'] ?? $row['name'] ?? $row['first name'] ?? '');

                if (! $telefono || ! $nombre) {
                    $errors[] = ['row' => $row, 'reason' => 'Nombre o teléfono vacío'];
                    continue;
                }

                $exists = Owner::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('telefono', $telefono)
                    ->exists();

                if ($exists) {
                    $skipped[] = ['nombre' => $nombre, 'telefono' => $telefono];
                } else {
                    $new[] = ['nombre' => $nombre, 'telefono' => $telefono, 'email' => $row['email'] ?? null];
                }
            } catch (\Throwable) {
                $errors[] = ['row' => $row, 'reason' => 'Error de formato'];
            }
        }

        return compact('new', 'skipped', 'errors');
    }

    private function importRows(array $rows, int $tenantId): array
    {
        $imported = $skipped = $errors = 0;

        foreach ($rows as $row) {
            try {
                $telefono = $this->normalizePhone($row['telefono'] ?? $row['phone'] ?? '');
                $nombre = trim($row['nombre'] ?? $row['name'] ?? $row['first name'] ?? '');

                if (! $telefono || ! $nombre) {
                    $errors++;
                    continue;
                }

                $exists = Owner::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('telefono', $telefono)
                    ->exists();

                if ($exists) {
                    $skipped++;
                    continue;
                }

                Owner::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'nombre' => $nombre,
                    'telefono' => $telefono,
                    'email' => $row['email'] ?? null,
                    'ghl_sync_status' => 'pending',
                ]);

                $imported++;
            } catch (\Throwable) {
                $errors++;
            }
        }

        return compact('imported', 'skipped', 'errors');
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/[^0-9+]/', '', $phone);
    }
}
