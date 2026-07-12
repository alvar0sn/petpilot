<?php

use App\Jobs\ProcessBirthdays;
use App\Jobs\ProcessMembershipExpiry;
use App\Jobs\ProcessReminders;
use App\Jobs\ProcessReviews;
use App\Jobs\ResetMembershipCredits;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new ProcessReminders)->dailyAt('08:00')->timezone('America/Mexico_City')->name('process-reminders')->withoutOverlapping();
Schedule::job(new ProcessBirthdays)->dailyAt('08:00')->timezone('America/Mexico_City')->name('process-birthdays')->withoutOverlapping();
Schedule::job(new ProcessMembershipExpiry)->dailyAt('06:00')->timezone('America/Mexico_City')->name('process-membership-expiry')->withoutOverlapping();
Schedule::job(new ProcessReviews)->dailyAt('09:00')->timezone('America/Mexico_City')->name('process-reviews')->withoutOverlapping();
Schedule::job(new ResetMembershipCredits)->dailyAt('05:00')->timezone('America/Mexico_City')->name('reset-membership-credits')->withoutOverlapping();
