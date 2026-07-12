<?php

if (! function_exists('currentTenant')) {
    function currentTenant(): ?\App\Models\Tenant
    {
        return app()->bound('current_tenant') ? app('current_tenant') : null;
    }
}

if (! function_exists('currentTenantId')) {
    function currentTenantId(): ?int
    {
        return currentTenant()?->id;
    }
}
