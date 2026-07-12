<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\GhlContactLog;
use App\Models\GhlWebhookLog;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LogController extends Controller
{
    public function index(Request $request): Response
    {
        $query_contact = GhlContactLog::withoutGlobalScopes()->with('tenant:id,nombre', 'owner:id,nombre,apellidos,telefono');
        $query_webhook = GhlWebhookLog::withoutGlobalScopes()->with('tenant:id,nombre');

        if ($request->tenant_id) {
            $query_contact->where('tenant_id', $request->tenant_id);
            $query_webhook->where('tenant_id', $request->tenant_id);
        }

        if ($request->status) {
            $query_contact->where('status', $request->status);
            $query_webhook->where('status', $request->status);
        }

        if ($request->date_from) {
            $query_contact->whereDate('created_at', '>=', $request->date_from);
            $query_webhook->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query_contact->whereDate('created_at', '<=', $request->date_to);
            $query_webhook->whereDate('created_at', '<=', $request->date_to);
        }

        return Inertia::render('SuperAdmin/Logs', [
            'contactLogs' => $query_contact->latest('created_at')->paginate(50)->withQueryString(),
            'webhookLogs' => $query_webhook->latest('created_at')->paginate(50)->withQueryString(),
            'tenants' => Tenant::select('id', 'nombre')->orderBy('nombre')->get(),
            'filters' => $request->only('tenant_id', 'status', 'date_from', 'date_to'),
        ]);
    }
}
