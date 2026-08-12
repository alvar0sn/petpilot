<?php

use App\Models\PosCategory;
use App\Models\Tenant;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_categories', function (Blueprint $table) {
            $table->boolean('es_extra')->default(false)->after('es_grooming');
        });

        Tenant::all(['id'])->each(function (Tenant $tenant) {
            PosCategory::withoutTenantScope()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'nombre' => 'Extras Estética'],
                [
                    'tenant_id'   => $tenant->id,
                    'nombre'      => 'Extras Estética',
                    'orden'       => (int) PosCategory::withoutTenantScope()->where('tenant_id', $tenant->id)->max('orden') + 1,
                    'activo'      => true,
                    'es_grooming' => true,
                    'es_extra'    => true,
                ]
            );
        });
    }

    public function down(): void
    {
        Schema::table('pos_categories', function (Blueprint $table) {
            $table->dropColumn('es_extra');
        });
    }
};
