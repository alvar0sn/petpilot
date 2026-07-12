<?php

namespace App\Traits;

use App\Scopes\TenantScope;

trait HasTenant
{
    public static function bootHasTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            if (empty($model->tenant_id) && app()->bound('current_tenant')) {
                $model->tenant_id = app('current_tenant')->id;
            }
        });
    }

    public function scopeForTenant($query, int $tenantId)
    {
        return $query->withoutGlobalScope(TenantScope::class)->where('tenant_id', $tenantId);
    }

    public static function withoutTenantScope(): \Illuminate\Database\Eloquent\Builder
    {
        return static::withoutGlobalScope(TenantScope::class);
    }
}
