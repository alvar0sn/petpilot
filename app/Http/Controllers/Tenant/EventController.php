<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventType;
use App\Models\Pet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function store(Request $request, Pet $pet): RedirectResponse
    {
        $base = $request->validate([
            'event_type_id' => 'required|exists:event_types,id',
            'fecha' => 'required|date',
            'notas' => 'nullable|string',
            'peso' => 'nullable|numeric|min:0',
        ]);

        $eventType = EventType::find($base['event_type_id']);

        $extra = match($eventType->nombre) {
            'Estética' => $request->validate([
                'est_verrugas' => 'boolean',
                'est_pulgas' => 'boolean',
                'est_secreciones' => 'boolean',
                'est_lesiones' => 'boolean',
                'est_alergias' => 'boolean',
                'est_manto' => 'nullable|string|max:50',
                'checklist_items' => 'nullable|array',
            ]),
            'Vacuna' => $request->validate([
                'vacuna_nombre'        => 'nullable|string|max:100',
                'vacuna_lote'          => 'nullable|string|max:50',
                'vacuna_laboratorio'   => 'nullable|string|max:100',
                'proximo_recordatorio' => 'nullable|date',
            ]),
            'Desparasitación' => $request->validate([
                'despa_producto'       => 'nullable|string|max:100',
                'despa_via'            => 'nullable|string|max:50',
                'proximo_recordatorio' => 'nullable|date',
            ]),
            'Consulta' => $request->validate([
                'consulta_temperatura'  => 'nullable|numeric',
                'consulta_motivo'       => 'nullable|string',
                'consulta_diagnostico'  => 'nullable|string',
                'consulta_medicamentos' => 'nullable|string',
                'consulta_proxima_cita' => 'nullable|date',
            ]),
            default => [],
        };

        // Manual date overrides auto-calculation from intervalo_dias
        $manualProximo = $extra['proximo_recordatorio'] ?? null;
        unset($extra['proximo_recordatorio']);

        $proximoRecordatorio = $manualProximo
            ?? ($eventType->intervalo_dias
                ? now()->parse($base['fecha'])->addDays($eventType->intervalo_dias)->toDateString()
                : null);

        $event = Event::create(array_merge($base, $extra, [
            'pet_id'               => $pet->id,
            'proximo_recordatorio' => $proximoRecordatorio,
            'created_by'           => auth()->id(),
        ]));

        // Sync checklist items for estética
        if ($eventType->nombre === 'Estética' && ! empty($extra['checklist_items'])) {
            $event->checklistItems()->sync($this->checklistSyncData($extra['checklist_items']));
        }

        // Sync pet recordatorios and peso from the new event
        $petUpdate = [];
        if (!empty($base['peso']))                         $petUpdate['peso'] = $base['peso'];
        if ($proximoRecordatorio) {
            if ($eventType->nombre === 'Vacuna')           $petUpdate['recordatorio_vacuna'] = $proximoRecordatorio;
            if ($eventType->nombre === 'Desparasitación')  $petUpdate['recordatorio_despa']  = $proximoRecordatorio;
        }
        if (!empty($extra['consulta_proxima_cita']))       $petUpdate['recordatorio_consulta'] = $extra['consulta_proxima_cita'];
        if (!empty($petUpdate))                            $pet->update($petUpdate);

        return back()->with('success', 'Evento registrado.');
    }

    public function edit(Event $event): \Inertia\Response
    {
        $event->load(['eventType', 'checklistItems:id']);
        $checklistItems = \App\Models\ChecklistItem::where('activo', true)->orderBy('orden')->get(['id', 'nombre']);

        return \Inertia\Inertia::render('Events/Edit', [
            'event' => $event,
            'checklistItems' => $checklistItems,
        ]);
    }

    public function update(Request $request, Event $event): RedirectResponse
    {
        $data = $request->validate([
            'fecha'                 => 'required|date',
            'notas'                 => 'nullable|string',
            'peso'                  => 'nullable|numeric|min:0',
            'proximo_recordatorio'  => 'nullable|date',
            'vacuna_nombre'         => 'nullable|string|max:100',
            'vacuna_lote'           => 'nullable|string|max:50',
            'vacuna_laboratorio'    => 'nullable|string|max:100',
            'despa_producto'        => 'nullable|string|max:100',
            'despa_via'             => 'nullable|string|max:50',
            'consulta_temperatura'  => 'nullable|numeric',
            'consulta_motivo'       => 'nullable|string',
            'consulta_diagnostico'  => 'nullable|string',
            'consulta_medicamentos' => 'nullable|string',
            'consulta_proxima_cita' => 'nullable|date',
            'est_verrugas'          => 'boolean',
            'est_pulgas'            => 'boolean',
            'est_secreciones'       => 'boolean',
            'est_lesiones'          => 'boolean',
            'est_alergias'          => 'boolean',
            'est_manto'             => 'nullable|string|max:50',
            'checklist_items'       => 'nullable|array',
        ]);

        $event->update($data);

        if (isset($data['checklist_items'])) {
            $event->checklistItems()->sync($this->checklistSyncData($data['checklist_items']));
        }

        // Sync pet recordatorios on edit
        $pet = Pet::find($event->pet_id);
        if ($pet) {
            $petUpdate = [];
            if (!empty($data['peso']))                         $petUpdate['peso'] = $data['peso'];
            $typeName = $event->eventType?->nombre;
            if (!empty($data['proximo_recordatorio'])) {
                if ($typeName === 'Vacuna')                    $petUpdate['recordatorio_vacuna'] = $data['proximo_recordatorio'];
                if ($typeName === 'Desparasitación')           $petUpdate['recordatorio_despa']  = $data['proximo_recordatorio'];
            }
            if (!empty($data['consulta_proxima_cita']))        $petUpdate['recordatorio_consulta'] = $data['consulta_proxima_cita'];
            if (!empty($petUpdate))                            $pet->update($petUpdate);
        }

        return redirect()->route('pets.show', $event->pet_id)->with('success', 'Evento actualizado.');
    }

    public function destroy(Event $event): RedirectResponse
    {
        $petId = $event->pet_id;
        $event->delete();
        return redirect()->route('pets.show', $petId)->with('success', 'Evento eliminado.');
    }

    private function checklistSyncData(array $checklistItemIds): array
    {
        return collect($checklistItemIds)
            ->mapWithKeys(fn($id) => [$id => ['tenant_id' => currentTenantId()]])
            ->all();
    }
}
