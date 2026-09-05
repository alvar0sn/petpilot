<?php

use App\Jobs\ProcessBirthdays;
use App\Jobs\ProcessMembershipExpiry;
use App\Jobs\ProcessReminders;
use App\Jobs\ProcessReviews;
use App\Jobs\ResetMembershipCredits;
use App\Jobs\ResetWhatsappCredits;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new ProcessReminders)->dailyAt('08:00')->timezone('America/Mexico_City')->name('process-reminders')->withoutOverlapping();
Schedule::job(new ProcessBirthdays)->dailyAt('08:00')->timezone('America/Mexico_City')->name('process-birthdays')->withoutOverlapping();
// 08:00 (no 06:00) para que el aviso de WhatsApp de membresía-por-vencer caiga dentro de la ventana 8am-8pm.
Schedule::job(new ProcessMembershipExpiry)->dailyAt('08:00')->timezone('America/Mexico_City')->name('process-membership-expiry')->withoutOverlapping();
Schedule::job(new ProcessReviews)->dailyAt('09:00')->timezone('America/Mexico_City')->name('process-reviews')->withoutOverlapping();
Schedule::job(new ResetMembershipCredits)->dailyAt('05:00')->timezone('America/Mexico_City')->name('reset-membership-credits')->withoutOverlapping();
Schedule::job(new ResetWhatsappCredits)->dailyAt('05:00')->timezone('America/Mexico_City')->name('reset-whatsapp-credits')->withoutOverlapping();
