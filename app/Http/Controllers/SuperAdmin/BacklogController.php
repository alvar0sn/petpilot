<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\BacklogItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BacklogController extends Controller
{
    public function index(): Response
    {
        $items = BacklogItem::orderBy('sort_order')->orderByDesc('created_at')->get();

        $grouped = collect(BacklogItem::$columns)->mapWithKeys(
            fn($label, $key) => [$key => $items->where('status', $key)->values()]
        );

        return Inertia::render('SuperAdmin/Backlog', [
            'columns' => BacklogItem::$columns,
            'types'   => BacklogItem::$types,
            'items'   => $grouped,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'type'        => 'required|in:feature,fix,improvement',
            'source_url'  => 'nullable|string|max:500',
        ]);

        BacklogItem::create($data + ['status' => 'backlog']);

        return back()->with('success', 'Ítem agregado al backlog.');
    }

    public function update(Request $request, BacklogItem $item): RedirectResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'type'        => 'required|in:feature,fix,improvement',
        ]);

        $item->update($data);

        return back()->with('success', 'Ítem actualizado.');
    }

    public function move(BacklogItem $item, string $direction): RedirectResponse
    {
        $keys = array_keys(BacklogItem::$columns);
        $idx  = array_search($item->status, $keys);
        $next = $direction === 'forward' ? $idx + 1 : $idx - 1;

        if (isset($keys[$next])) {
            $item->update(['status' => $keys[$next]]);
        }

        return back();
    }

    public function destroy(BacklogItem $item): RedirectResponse
    {
        $item->delete();

        return back()->with('success', 'Ítem eliminado.');
    }
}
