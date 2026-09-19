<?php

namespace App\Http\Controllers;

use App\Models\LegalAcceptance;
use App\Models\LegalDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LegalAcceptanceController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $pending = $this->pendingDocuments();

        if ($pending->isEmpty()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Legal/Aceptar', [
            'documents' => $pending->map(fn (LegalDocument $doc) => [
                'type' => $doc->type,
                'version' => $doc->version,
            ])->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'accepted' => ['accepted'],
        ]);

        $pending = $this->pendingDocuments();
        $tenant = app('current_tenant');
        $user = $request->user();

        DB::transaction(function () use ($pending, $tenant, $user, $request) {
            $now = now();
            foreach ($pending as $document) {
                LegalAcceptance::create([
                    'tenant_id' => $tenant->id,
                    'user_id' => $user->id,
                    'legal_document_id' => $document->id,
                    'accepted_at' => $now,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            }
        });

        return redirect()->route('dashboard');
    }

    private function pendingDocuments()
    {
        $tenant = app('current_tenant');

        return collect(['tos', 'data_agreement'])
            ->map(fn (string $type) => LegalDocument::current($type))
            ->filter()
            ->filter(fn (LegalDocument $doc) => ! LegalAcceptance::where('tenant_id', $tenant->id)
                ->where('legal_document_id', $doc->id)
                ->exists());
    }
}
