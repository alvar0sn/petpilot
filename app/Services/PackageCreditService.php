<?php

namespace App\Services;

use App\Models\PackageCredit;
use App\Models\PackageCreditMovement;

/**
 * Consumo de créditos de paquete (ver App\Models\Package) — mismo espíritu
 * que el descuento de MembershipCredit en cada controlador, pero indexado
 * por pos_catalog_item_id en vez de servicio_tipo, y sin recarga (un
 * paquete se compra una vez y sus créditos se agotan o caducan).
 */
class PackageCreditService
{
    public static function findCredit(int $petId, int $posCatalogItemId): ?PackageCredit
    {
        return PackageCredit::where('pet_id', $petId)
            ->where('pos_catalog_item_id', $posCatalogItemId)
            ->where('saldo_actual', '>', 0)
            ->where('fecha_vencimiento', '>=', now()->toDateString())
            ->orderBy('fecha_vencimiento')
            ->first();
    }

    public static function consume(PackageCredit $credit, float $cantidad, string $referenciaTipo, ?int $referenciaId, string $notas): void
    {
        $saldoAntes = (float) $credit->saldo_actual;
        $saldoDespues = max(0, $saldoAntes - $cantidad);

        $credit->update(['saldo_actual' => $saldoDespues]);

        PackageCreditMovement::create([
            'credit_id' => $credit->id,
            'tipo' => 'consumo',
            'cantidad' => -$cantidad,
            'saldo_antes' => $saldoAntes,
            'saldo_despues' => $saldoDespues,
            'referencia_tipo' => $referenciaTipo,
            'referencia_id' => $referenciaId,
            'user_id' => auth()->id(),
            'notas' => $notas,
        ]);
    }

    public static function restore(PackageCredit $credit, float $cantidad, string $referenciaTipo, ?int $referenciaId, string $notas): void
    {
        $saldoAntes = (float) $credit->saldo_actual;
        $saldoDespues = min((float) $credit->saldo_inicial, $saldoAntes + $cantidad);

        $credit->update(['saldo_actual' => $saldoDespues]);

        PackageCreditMovement::create([
            'credit_id' => $credit->id,
            'tipo' => 'ajuste',
            'cantidad' => $saldoDespues - $saldoAntes,
            'saldo_antes' => $saldoAntes,
            'saldo_despues' => $saldoDespues,
            'referencia_tipo' => $referenciaTipo,
            'referencia_id' => $referenciaId,
            'user_id' => auth()->id(),
            'notas' => $notas,
        ]);
    }
}
