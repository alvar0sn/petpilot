<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Tenant\EventController;
use App\Http\Controllers\Tenant\OwnerController;
use App\Http\Controllers\Tenant\PetController;
use App\Http\Controllers\Tenant\DashboardController;
use App\Http\Controllers\Tenant\HotelController;
use App\Http\Controllers\Tenant\MembershipController;
use App\Http\Controllers\Tenant\AppointmentController;
use App\Http\Controllers\Tenant\VetController;
use App\Http\Controllers\Tenant\WalkSlotController;
use App\Http\Controllers\Tenant\WalkBookingController;
use App\Http\Controllers\Auth\TenantAuthController;
use App\Http\Controllers\Portal\OwnerAuthController;
use App\Http\Controllers\Portal\OwnerPortalController;
use App\Http\Controllers\Tenant\PosDiscountController;
use App\Http\Controllers\Tenant\PosShiftController;
use App\Http\Controllers\Tenant\PosTicketController;
use App\Http\Controllers\Tenant\SettingsController;
use App\Http\Controllers\SuperAdmin\BacklogController;
use App\Http\Controllers\SuperAdmin\CsvImportController;
use App\Http\Controllers\SuperAdmin\ImpersonationController;
use App\Http\Controllers\SuperAdmin\LogController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PublicTicketController;
use App\Http\Controllers\SuperAdmin\TenantController;
use App\Http\Controllers\SuperAdmin\AgencyUserController;
use App\Http\Controllers\SuperAdmin\SuperAdminOwnersController;
use App\Http\Controllers\SuperAdmin\SystemSettingsController;
use App\Http\Controllers\SuperAdmin\TenantUserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});


Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'role:tenant_admin,colaborador'])->group(function () {

    // CRM — owners, pets, events
    Route::middleware('module:crm')->group(function () {
        Route::resource('owners', OwnerController::class);
        Route::post('owners/{owner}/sync-ghl', [OwnerController::class, 'syncGhl'])->name('owners.sync-ghl');
        Route::post('owners/{owner}/portal-access', [OwnerController::class, 'sendPortalAccess'])->name('owners.portal-access');

        Route::get('owners/{owner}/pets/create', [PetController::class, 'create'])->name('pets.create');
        Route::post('owners/{owner}/pets', [PetController::class, 'store'])->name('pets.store');
        Route::get('pets/{pet}', [PetController::class, 'show'])->name('pets.show');
        Route::get('pets/{pet}/edit', [PetController::class, 'edit'])->name('pets.edit');
        Route::put('pets/{pet}', [PetController::class, 'update'])->name('pets.update');
        Route::put('pets/{pet}/recordatorios', [PetController::class, 'updateRecordatorios'])->name('pets.recordatorios.update');
        Route::post('pets/{pet}/foto', [PetController::class, 'storePhoto'])->name('pets.foto.store');
        Route::delete('pets/{pet}/foto', [PetController::class, 'destroyPhoto'])->name('pets.foto.destroy');
        Route::delete('pets/{pet}', [PetController::class, 'destroy'])->name('pets.destroy');

        Route::post('pets/{pet}/events', [EventController::class, 'store'])->name('events.store');
        Route::get('events/{event}/edit', [EventController::class, 'edit'])->name('events.edit');
        Route::put('events/{event}', [EventController::class, 'update'])->name('events.update');
        Route::delete('events/{event}', [EventController::class, 'destroy'])->name('events.destroy');
    });

    // POS
    Route::middleware('module:pos')->group(function () {
        Route::get('pos', [PosTicketController::class, 'index'])->name('pos.index');
        Route::get('pos/history', [PosTicketController::class, 'history'])->name('pos.history');
        Route::post('pos/tickets', [PosTicketController::class, 'store'])->name('pos.tickets.store');
        Route::get('pos/tickets/{ticket}', [PosTicketController::class, 'show'])->name('pos.tickets.show');
        Route::post('pos/tickets/{ticket}/lines', [PosTicketController::class, 'addLine'])->name('pos.tickets.lines.add');
        Route::delete('pos/tickets/{ticket}/lines', [PosTicketController::class, 'removeLine'])->name('pos.tickets.lines.remove');
        Route::patch('pos/tickets/{ticket}/lines', [PosTicketController::class, 'updateLine'])->name('pos.tickets.lines.update');
        Route::post('pos/tickets/{ticket}/discount', [PosTicketController::class, 'applyDiscount'])->name('pos.tickets.discount');
        Route::post('pos/tickets/{ticket}/owner', [PosTicketController::class, 'setOwner'])->name('pos.tickets.owner');
        Route::post('pos/tickets/{ticket}/pay', [PosTicketController::class, 'pay'])->name('pos.tickets.pay');
        Route::post('pos/tickets/{ticket}/cancel', [PosTicketController::class, 'cancel'])->name('pos.tickets.cancel');

        Route::get('pos/shifts', [PosShiftController::class, 'index'])->name('pos.shift.index');
        Route::post('pos/shifts', [PosShiftController::class, 'store'])->name('pos.shift.store');
        Route::post('pos/shifts/{shift}/close', [PosShiftController::class, 'close'])->name('pos.shift.close');
        Route::post('pos/shifts/{shift}/movement', [PosShiftController::class, 'addMovement'])->name('pos.shift.movement');

        Route::get('pos/catalog', [SettingsController::class, 'catalog'])->name('pos.catalog');

        Route::get('pos/discounts', [PosDiscountController::class, 'index'])->name('pos.discounts.index');
        Route::post('pos/discounts', [PosDiscountController::class, 'store'])->name('pos.discounts.store');
        Route::put('pos/discounts/{discount}', [PosDiscountController::class, 'update'])->name('pos.discounts.update');
        Route::delete('pos/discounts/{discount}', [PosDiscountController::class, 'destroy'])->name('pos.discounts.destroy');
    });

    // Membresías
    Route::middleware('module:memberships')->group(function () {
        Route::get('memberships', [MembershipController::class, 'index'])->name('memberships.index');
        Route::post('memberships/assign', [MembershipController::class, 'assign'])->name('memberships.assign');
        Route::get('memberships/{membership}', [MembershipController::class, 'show'])->name('memberships.show');
        Route::put('memberships/{membership}', [MembershipController::class, 'update'])->name('memberships.update');
        Route::post('memberships/{membership}/adjust', [MembershipController::class, 'adjust'])->name('memberships.adjust');
        Route::post('memberships/{membership}/deactivate', [MembershipController::class, 'deactivate'])->name('memberships.deactivate');
        Route::post('memberships/{membership}/freeze', [MembershipController::class, 'freeze'])->name('memberships.freeze');
        Route::post('memberships/{membership}/unfreeze', [MembershipController::class, 'unfreeze'])->name('memberships.unfreeze');
        Route::get('membership-plans', [MembershipController::class, 'plans'])->name('memberships.plans');
        Route::post('membership-plans', [MembershipController::class, 'storePlan'])->name('memberships.plans.store');
        Route::put('membership-plans/{plan}', [MembershipController::class, 'updatePlan'])->name('memberships.plans.update');
    });

    // Hotel / Guardería
    Route::middleware('module:hotel')->group(function () {
        Route::get('hotel-config', [HotelController::class, 'config'])->name('hotel.config');
        Route::post('hotel-config/spaces', [HotelController::class, 'storeSpace'])->name('hotel.spaces.store');
        Route::put('hotel-config/spaces/{space}', [HotelController::class, 'updateSpace'])->name('hotel.spaces.update');
        Route::delete('hotel-config/spaces/{space}', [HotelController::class, 'destroySpace'])->name('hotel.spaces.destroy');
        Route::post('hotel-config/rates', [HotelController::class, 'storeRate'])->name('hotel.rates.store');
        Route::put('hotel-config/rates/{rate}', [HotelController::class, 'updateRate'])->name('hotel.rates.update');
        Route::delete('hotel-config/rates/{rate}', [HotelController::class, 'destroyRate'])->name('hotel.rates.destroy');

        Route::get('hotel', [HotelController::class, 'index'])->name('hotel.index');
        Route::post('hotel', [HotelController::class, 'store'])->name('hotel.store');
        Route::get('hotel/{stay}', [HotelController::class, 'show'])->name('hotel.show');
        Route::put('hotel/{stay}', [HotelController::class, 'update'])->name('hotel.update');
        Route::post('hotel/{stay}/checkin', [HotelController::class, 'checkin'])->name('hotel.checkin');
        Route::post('hotel/{stay}/payments', [HotelController::class, 'storePayment'])->name('hotel.payments.store');
        Route::post('hotel/{stay}/checkout', [HotelController::class, 'checkout'])->name('hotel.checkout');
        Route::post('hotel/{stay}/cancel', [HotelController::class, 'cancel'])->name('hotel.cancel');
        Route::post('hotel/{stay}/photos', [HotelController::class, 'storePhoto'])->name('hotel.photos.store');
        Route::delete('hotel/{stay}/photos/{photo}', [HotelController::class, 'destroyPhoto'])->name('hotel.photos.destroy');
    });

    // Paseos
    Route::middleware('module:paseos')->group(function () {
        Route::get('walks', [WalkSlotController::class, 'index'])->name('walks.index');
        Route::post('walks', [WalkSlotController::class, 'store'])->name('walks.store');
        Route::get('walks/{walkSlot}', [WalkSlotController::class, 'show'])->name('walks.show');
        Route::put('walks/{walkSlot}', [WalkSlotController::class, 'update'])->name('walks.update');
        Route::post('walks/{walkSlot}/complete', [WalkSlotController::class, 'complete'])->name('walks.complete');
        Route::post('walks/{walkSlot}/cancel', [WalkSlotController::class, 'cancel'])->name('walks.cancel');
        Route::post('walk-recurrences/{walkRecurrence}/extend', [WalkSlotController::class, 'extendRecurrence'])->name('walks.recurrences.extend');
        Route::post('walks/{walkSlot}/bookings', [WalkBookingController::class, 'store'])->name('walks.bookings.store');
        Route::post('walk-bookings/{walkBooking}/approve', [WalkBookingController::class, 'approve'])->name('walks.bookings.approve');
        Route::post('walk-bookings/{walkBooking}/cancel', [WalkBookingController::class, 'cancel'])->name('walks.bookings.cancel');
    });

    // Grooming
    Route::middleware('module:grooming')->group(function () {
        Route::get('grooming', [AppointmentController::class, 'index'])->name('grooming.index');
        Route::post('grooming', [AppointmentController::class, 'store'])->name('grooming.store');
        Route::get('grooming/{appointment}', [AppointmentController::class, 'show'])->name('grooming.show');
        Route::put('grooming/{appointment}', [AppointmentController::class, 'update'])->name('grooming.update');
        Route::put('grooming/{appointment}/items', [AppointmentController::class, 'updateItems'])->name('grooming.items');
        Route::post('grooming/{appointment}/confirm', [AppointmentController::class, 'confirm'])->name('grooming.confirm');
        Route::post('grooming/{appointment}/complete', [AppointmentController::class, 'complete'])->name('grooming.complete');
        Route::post('grooming/{appointment}/cancel', [AppointmentController::class, 'cancel'])->name('grooming.cancel');
        Route::post('grooming/{appointment}/no-show', [AppointmentController::class, 'noShow'])->name('grooming.noShow');
        Route::post('grooming/{appointment}/recepcion', [AppointmentController::class, 'storeRecepcion'])->name('grooming.recepcion');
        Route::post('grooming/{appointment}/photos', [AppointmentController::class, 'storePhoto'])->name('grooming.photos.store');
        Route::delete('grooming/{appointment}/photos/{photo}', [AppointmentController::class, 'destroyPhoto'])->name('grooming.photos.destroy');
    });

    // Veterinaria
    Route::middleware('module:veterinaria')->group(function () {
        Route::get('veterinaria', [VetController::class, 'index'])->name('vet.index');
        Route::post('veterinaria', [VetController::class, 'store'])->name('vet.store');
        Route::get('veterinaria/{appointment}', [VetController::class, 'show'])->name('vet.show');
        Route::put('veterinaria/{appointment}', [VetController::class, 'update'])->name('vet.update');
        Route::post('veterinaria/{appointment}/confirm', [VetController::class, 'confirm'])->name('vet.confirm');
        Route::post('veterinaria/{appointment}/complete', [VetController::class, 'complete'])->name('vet.complete');
        Route::post('veterinaria/{appointment}/cancel', [VetController::class, 'cancel'])->name('vet.cancel');
        Route::post('veterinaria/{appointment}/no-show', [VetController::class, 'noShow'])->name('vet.noShow');
        Route::post('veterinaria/{appointment}/recepcion', [VetController::class, 'storeRecepcion'])->name('vet.recepcion');
        Route::post('veterinaria/{appointment}/photos', [VetController::class, 'storePhoto'])->name('vet.photos.store');
        Route::delete('veterinaria/{appointment}/photos/{photo}', [VetController::class, 'destroyPhoto'])->name('vet.photos.destroy');
    });

    // Settings — always accessible
    Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::get('settings/catalog/sample', [SettingsController::class, 'catalogSample'])->name('settings.catalog.sample');
    Route::post('settings/catalog/import', [SettingsController::class, 'importCatalog'])->name('settings.catalog.import');
    Route::post('settings/catalog/categories', [SettingsController::class, 'storeCategory'])->name('settings.catalog.categories.store');
    Route::put('settings/catalog/categories/{category}', [SettingsController::class, 'updateCategory'])->name('settings.catalog.categories.update');
    Route::delete('settings/catalog/categories/{category}', [SettingsController::class, 'destroyCategory'])->name('settings.catalog.categories.destroy');
    Route::post('settings/catalog/items', [SettingsController::class, 'storeItem'])->name('settings.catalog.items.store');
    Route::put('settings/catalog/items/{item}', [SettingsController::class, 'updateItem'])->name('settings.catalog.items.update');
    Route::delete('settings/catalog/items/{item}', [SettingsController::class, 'destroyItem'])->name('settings.catalog.items.destroy');
    Route::post('settings/grooming-checklist', [SettingsController::class, 'storeChecklistItem'])->name('settings.grooming.checklist.store');
    Route::put('settings/grooming-checklist/{checklistItem}', [SettingsController::class, 'updateChecklistItem'])->name('settings.grooming.checklist.update');
    Route::delete('settings/grooming-checklist/{checklistItem}', [SettingsController::class, 'destroyChecklistItem'])->name('settings.grooming.checklist.destroy');
    Route::post('settings/grooming-stations', [SettingsController::class, 'storeStation'])->name('settings.grooming.stations.store');
    Route::put('settings/grooming-stations/{station}', [SettingsController::class, 'updateStation'])->name('settings.grooming.stations.update');
    Route::delete('settings/grooming-stations/{station}', [SettingsController::class, 'destroyStation'])->name('settings.grooming.stations.destroy');
    Route::post('settings/payment-methods', [SettingsController::class, 'storePaymentMethod'])->name('settings.payment_methods.store');
    Route::put('settings/payment-methods/{method}', [SettingsController::class, 'updatePaymentMethod'])->name('settings.payment_methods.update');
    Route::delete('settings/payment-methods/{method}', [SettingsController::class, 'destroyPaymentMethod'])->name('settings.payment_methods.destroy');
    Route::post('settings/ticket-config', [SettingsController::class, 'updateTicketConfig'])->name('settings.ticket.update');
    Route::post('settings/walk-config', [SettingsController::class, 'updateWalkConfig'])->name('settings.walk.update');

    // Team management & razas — tenant_admin only
    Route::middleware('role:tenant_admin')->group(function () {
        Route::post('settings/team', [SettingsController::class, 'storeTeamMember'])->name('settings.team.store');
        Route::put('settings/team/{user}', [SettingsController::class, 'updateTeamMember'])->name('settings.team.update');
        Route::put('settings/team/{user}/password', [SettingsController::class, 'updateTeamMemberPassword'])->name('settings.team.password');
        Route::delete('settings/team/{user}', [SettingsController::class, 'destroyTeamMember'])->name('settings.team.destroy');

        Route::post('settings/razas', [SettingsController::class, 'storeRaza'])->name('settings.razas.store');
        Route::delete('settings/razas/{raza}', [SettingsController::class, 'destroyRaza'])->name('settings.razas.destroy');
    });

    // Landing editor — always accessible
    Route::get('landing', [LandingController::class, 'editor'])->name('landing.editor');
    Route::post('landing', [LandingController::class, 'update'])->name('landing.update');
});

// Super Admin
Route::middleware(['auth', 'role:super_admin'])->prefix('super-admin')->name('super-admin.')->group(function () {
    Route::get('/', [TenantController::class, 'index'])->name('index');

    Route::resource('tenants', TenantController::class)->except(['edit']);
    Route::put('tenants/{tenant}/ghl', [TenantController::class, 'updateGhl'])->name('tenants.ghl');
    Route::post('tenants/{tenant}/ghl/test', [TenantController::class, 'testWebhook'])->name('tenants.ghl.test');
    Route::patch('tenants/{tenant}/toggle', [TenantController::class, 'toggle'])->name('tenants.toggle');

    Route::post('tenants/{tenant}/users', [TenantUserController::class, 'store'])->name('tenants.users.store');
    Route::put('tenants/{tenant}/users/{user}', [TenantUserController::class, 'update'])->name('tenants.users.update');
    Route::put('tenants/{tenant}/users/{user}/password', [TenantUserController::class, 'updatePassword'])->name('tenants.users.password');
    Route::delete('tenants/{tenant}/users/{user}', [TenantUserController::class, 'destroy'])->name('tenants.users.destroy');

    Route::post('tenants/{tenant}/impersonate', [ImpersonationController::class, 'start'])->name('impersonate.start');
    Route::post('impersonate/stop', [ImpersonationController::class, 'stop'])->name('impersonate.stop');

    Route::get('tenants/{tenant}/import', [CsvImportController::class, 'show'])->name('import.show');
    Route::post('tenants/{tenant}/import/preview', [CsvImportController::class, 'preview'])->name('import.preview');
    Route::post('tenants/{tenant}/import/confirm', [CsvImportController::class, 'confirm'])->name('import.confirm');

    Route::get('logs', [LogController::class, 'index'])->name('logs');

    Route::get('backlog', [BacklogController::class, 'index'])->name('backlog.index');
    Route::post('backlog', [BacklogController::class, 'store'])->name('backlog.store');

    Route::get('owners', [SuperAdminOwnersController::class, 'index'])->name('owners.index');
    Route::post('owners/sync-bulk', [SuperAdminOwnersController::class, 'syncBulk'])->name('owners.sync-bulk');
    Route::post('owners/{owner}/sync', [SuperAdminOwnersController::class, 'sync'])->name('owners.sync');

    Route::get('system-settings', [SystemSettingsController::class, 'index'])->name('system-settings.index');
    Route::post('system-settings/r2', [SystemSettingsController::class, 'updateR2'])->name('system-settings.r2');
    Route::post('system-settings/r2/test', [SystemSettingsController::class, 'testR2'])->name('system-settings.r2.test');
    Route::post('system-settings/resend', [SystemSettingsController::class, 'updateResend'])->name('system-settings.resend');

    Route::get('agency-users', [AgencyUserController::class, 'index'])->name('agency-users.index');
    Route::post('agency-users', [AgencyUserController::class, 'store'])->name('agency-users.store');
    Route::put('agency-users/{user}', [AgencyUserController::class, 'update'])->name('agency-users.update');
    Route::put('agency-users/{user}/password', [AgencyUserController::class, 'updatePassword'])->name('agency-users.password');
    Route::delete('agency-users/{user}', [AgencyUserController::class, 'destroy'])->name('agency-users.destroy');
    Route::put('backlog/{item}', [BacklogController::class, 'update'])->name('backlog.update');
    Route::patch('backlog/{item}/move/{direction}', [BacklogController::class, 'move'])->name('backlog.move');
    Route::delete('backlog/{item}', [BacklogController::class, 'destroy'])->name('backlog.destroy');
});

require __DIR__.'/auth.php';

// Tenant staff login (one per tenant)
Route::prefix('{tenant:slug}')->name('tenant.')->group(function () {
    Route::get('login', [TenantAuthController::class, 'showLogin'])->name('login');
    Route::post('login', [TenantAuthController::class, 'login'])->name('login.post');
    Route::post('logout', [TenantAuthController::class, 'logout'])->name('logout');
});

// Owner Portal
Route::prefix('{tenant:slug}')->name('portal.')->group(function () {
    Route::get('portal', fn($tenant) => redirect()->route('tenant.login', ['tenant' => $tenant]))->name('login');
    Route::post('portal', [OwnerAuthController::class, 'login'])->name('login.post');
    Route::post('portal/salir', [OwnerAuthController::class, 'logout'])->name('logout');
    Route::get('olvide-contrasena', [OwnerAuthController::class, 'showForgotPassword'])->name('forgot-password');
    Route::post('olvide-contrasena', [OwnerAuthController::class, 'sendResetLink'])->name('forgot-password.post')->middleware('throttle:3,1');
    Route::get('nueva-contrasena/{token}', [OwnerAuthController::class, 'showResetPassword'])->name('reset-password');
    Route::post('nueva-contrasena', [OwnerAuthController::class, 'resetPassword'])->name('reset-password.post');

    Route::middleware('auth.owner')->group(function () {
        Route::get('inicio', [OwnerPortalController::class, 'home'])->name('dashboard');
        Route::get('mascotas/{pet}', [OwnerPortalController::class, 'petHistory'])->name('pet.history');
        Route::get('membresias', [OwnerPortalController::class, 'memberships'])->name('memberships');
        Route::get('paseos', [OwnerPortalController::class, 'walks'])->name('walks');
        Route::post('paseos/{walkSlot}/solicitar', [OwnerPortalController::class, 'requestBooking'])->name('walks.request');
    });
});

// Public ticket view (no auth)
Route::get('/t/{token}', [PublicTicketController::class, 'show'])->name('ticket.public');

// Public studio landing — must be last to avoid catching other routes
Route::get('/{slug}', [LandingController::class, 'show'])
    ->name('studio.landing')
    ->where('slug', '[a-z0-9][a-z0-9-]*');
