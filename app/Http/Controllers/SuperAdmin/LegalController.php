<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\LegalAcceptance;
use App\Models\LegalDocument;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LegalController extends Controller
{
    public function index(Request $request): Response
    {
        $documents = LegalDocument::orderBy('type')->orderByDesc('created_at')->get();

        $acceptances = LegalAcceptance::with(['tenant:id,nombre,slug', 'user:id,nombre,apellido,email', 'legalDocument:id,type,version'])
            ->when($request->filled('tenant_id'), fn ($q) => $q->where('tenant_id', $request->integer('tenant_id')))
            ->when($request->filled('type'), fn ($q) => $q->whereHas(
                'legalDocument',
                fn ($q2) => $q2->where('type', $request->string('type'))
            ))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('accepted_at', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('accepted_at', '<=', $request->input('to')))
            ->latest('accepted_at')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('SuperAdmin/Legal/Index', [
            'documents' => $documents->map(fn (LegalDocument $doc) => [
                'id' => $doc->id,
                'type' => $doc->type,
                'version' => $doc->version,
                'change_summary' => $doc->change_summary,
                'is_current' => $doc->is_current,
                'published_at' => $doc->published_at,
            ]),
            'acceptances' => $acceptances->through(fn (LegalAcceptance $a) => [
                'id' => $a->id,
                'tenant' => $a->tenant ? ['id' => $a->tenant->id, 'nombre' => $a->tenant->nombre] : null,
                'user' => $a->user ? ['id' => $a->user->id, 'nombre' => trim($a->user->nombre . ' ' . $a->user->apellido), 'email' => $a->user->email] : null,
                'document' => $a->legalDocument ? ['type' => $a->legalDocument->type, 'version' => $a->legalDocument->version] : null,
                'accepted_at' => $a->accepted_at,
                'ip_address' => $a->ip_address,
            ]),
            'tenants' => Tenant::orderBy('nombre')->get(['id', 'nombre']),
            'filters' => $request->only(['tenant_id', 'type', 'from', 'to']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type' => 'required|in:tos,data_agreement',
            'version' => 'required|string|max:50',
            'content' => 'required|string',
            'change_summary' => 'nullable|string|max:2000',
        ]);

        $document = LegalDocument::create($data);
        $document->makeCurrent();

        return back()->with('success', 'Nueva versión publicada. Se pedirá re-consentimiento a todos los tenants.');
    }
}
