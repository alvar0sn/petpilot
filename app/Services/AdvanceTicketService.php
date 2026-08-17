<?php

namespace App\Services;

use App\Models\PosConfig;
use App\Models\PosShift;
use App\Models\PosTicket;
use App\Models\PosTicketLine;

class AdvanceTicketService
{
    public function create(?int $ownerId, float $monto, string $nombreSnapshot, ?int $itemId = null): PosTicket
    {
        $shift = PosShift::where('estado', 'abierto')->first();

        $ticket = PosTicket::create([
            'folio' => $this->nextFolio(),
            'owner_id' => $ownerId,
            'estado' => 'abierto',
            'shift_open_id' => $shift?->id,
            'user_open_id' => auth()->id(),
            'user_last_edit_id' => auth()->id(),
            'subtotal' => $monto,
            'total' => $monto,
        ]);

        PosTicketLine::create([
            'ticket_id' => $ticket->id,
            'item_id' => $itemId,
            'nombre_snapshot' => $nombreSnapshot,
            'precio_snapshot' => $monto,
            'costo_snapshot' => 0,
            'cantidad' => 1,
            'subtotal' => $monto,
        ]);

        return $ticket;
    }

    private function nextFolio(): int
    {
        $config = PosConfig::where('clave', 'folio_siguiente')->first();
        $folio = $config ? (int) $config->valor : 1;
        $config
            ? $config->update(['valor' => $folio + 1])
            : PosConfig::create(['clave' => 'folio_siguiente', 'valor' => $folio + 1]);

        return $folio;
    }
}
