<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MembershipPlanCredit extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $table = 'membership_plan_credits';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'servicio_tipo',
        'creditos',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'plan_id');
    }
}
