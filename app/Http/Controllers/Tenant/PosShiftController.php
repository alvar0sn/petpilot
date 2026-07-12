<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\PosCashMovement;
use App\Models\PosShift;
use App\Models\PosTicket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosShiftController extends Controller
{
    public function index(): Response
    {
        $activeShift = PosShift::where('estado', 'abierto')
            ->with(['user:id,nombre,apellido', 'cashMovements'])
            ->latest('fecha_apertura')
            ->first();

        $recentShifts = PosShift::with('user:id,nombre,apellido')
            ->where('estado', 'cerrado')
            ->latest('fecha_apertura')
            ->limit(10)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'user' => $s->user?->nombre . ' ' . $s->user?->apellido,
                'fecha_apertura' => $s->fecha_apertura,
                'fecha_cierre' => $s->fecha_cierre,
                'fondo_inicial' => $s->fondo_inicial,
                'efectivo_contado' => $s->efectivo_contado,
                'total_tickets' => PosTicket::where('shift_open_id', $s->id)->where('estado', 'pagado')->sum('total'),
            ]);

        return Inertia::render('Pos/Shift', [
            'activeShift' => $activeShift ? [
                'id' => $activeShift->id,
                'user' => $activeShift->user?->nombre . ' ' . $activeShift->user?->apellido,
                'fecha_apertura' => $activeShift->fecha_apertura,
                'fondo_inicial' => $activeShift->fondo_inicial,
                'cashMovements' => $activeShift->cashMovements,
                'total_tickets' => PosTicket::where('shift_open_id', $activeShift->id)->where('estado', 'pagado')->sum('total'),
                'count_tickets' => PosTicket::where('shift_open_id', $activeShift->id)->where('estado', 'pagado')->count(),
            ] : null,
            'recentShifts' => $recentShifts,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (PosShift::where('estado', 'abierto')->exists()) {
            return back()->withErrors(['error' => 'Ya hay un turno abierto.']);
        }

        $data = $request->validate([
            'fondo_inicial' => 'required|numeric|min:0',
        ]);

        PosShift::create([
            'user_id' => auth()->id(),
            'fecha_apertura' => now(),
            'fondo_inicial' => $data['fondo_inicial'],
            'estado' => 'abierto',
        ]);

        return redirect()->route('pos.index')->with('success', 'Turno abierto.');
    }

    public function close(Request $request, PosShift $shift): RedirectResponse
    {
        if (! $shift->isOpen()) {
            return back()->withErrors(['error' => 'El turno ya está cerrado.']);
        }

        $data = $request->validate([
            'efectivo_contado' => 'required|numeric|min:0',
        ]);

        $shift->update([
            'efectivo_contado' => $data['efectivo_contado'],
            'fecha_cierre' => now(),
            'estado' => 'cerrado',
        ]);

        return redirect()->route('pos.shift.index')->with('success', 'Turno cerrado.');
    }

    public function addMovement(Request $request, PosShift $shift): RedirectResponse
    {
        $data = $request->validate([
            'tipo' => 'required|in:deposito,salida',
            'monto' => 'required|numeric|min:0.01',
            'comentario' => 'nullable|string|max:200',
        ]);

        PosCashMovement::create([
            'shift_id' => $shift->id,
            'user_id' => auth()->id(),
            'tipo' => $data['tipo'],
            'monto' => $data['monto'],
            'comentario' => $data['comentario'],
        ]);

        return back()->with('success', 'Movimiento registrado.');
    }
}
