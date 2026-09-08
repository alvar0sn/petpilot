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
        return self::availableQuery($petId)
            ->where('pos_catalog_item_id', $posCatalogItemId)
            ->orderBy('fecha_vencimiento')
            ->first();
    }

    /**
     * Créditos de paquete usables por esta mascota (paquete pagado, con
     * saldo y sin caducar), uno por artículo de catálogo — para mostrarlos
     * en la UI de agendado antes de cobrar, igual que se hace con membresías.
     */
    public static function availableForPet(int $petId): \Illuminate\Support\Collection
    {
        return self::availableQuery($petId)
            ->with('catalogItem:id,nombre')
            ->get()
            ->map(fn(PackageCredit $c) => [
                'catalog_item_id' => $c->pos_catalog_item_id,
                'nombre' => $c->catalogItem?->nombre ?? $c->nombre_snapshot,
                'saldo_actual' => (float) $c->saldo_actual,
            ]);
    }

    private static function availableQuery(int $petId): \Illuminate\Database\Eloquent\Builder
    {
        return PackageCredit::where('pet_id', $petId)
            ->where('saldo_actual', '>', 0)
            ->where('fecha_vencimiento', '>=', now()->toDateString())
            ->whereHas('package.ticket', fn($q) => $q->where('estado', 'pagado'));
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
