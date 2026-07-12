import { usePage } from '@inertiajs/react';

export const DEFAULT_TIMEZONE = 'America/Mexico_City';

/**
 * El backend serializa fechas como instantes UTC (sufijo "Z"), pero representan
 * horarios de pared en la zona horaria del negocio (tenant.timezone). Sin pasar
 * `timeZone` explícitamente, `toLocaleDateString`/`toLocaleString` usan la zona
 * horaria del dispositivo del usuario, lo que puede mostrar un día distinto al
 * registrado por el negocio. Estas utilidades fuerzan siempre la zona del tenant.
 */
export function useTenantTimezone() {
    const { props } = usePage();
    return props?.tenant?.timezone || DEFAULT_TIMEZONE;
}

export function formatDate(value, timeZone = DEFAULT_TIMEZONE, options = {}) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options,
        timeZone,
    });
}

export function formatDateTime(value, timeZone = DEFAULT_TIMEZONE, options = {}) {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-MX', { ...options, timeZone });
}

export function formatTime(value, timeZone = DEFAULT_TIMEZONE, options = {}) {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString('es-MX', { ...options, timeZone });
}

/**
 * Devuelve la fecha de calendario (YYYY-MM-DD) que representa `value` en la
 * zona horaria del negocio. Útil para comparar "días" sin que la conversión
 * dependa de la zona horaria del dispositivo de quien lo está viendo.
 */
export function dateKeyInTimezone(value, timeZone = DEFAULT_TIMEZONE) {
    if (!value) return null;
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(value));
}

export function isSameDayInTimezone(a, b, timeZone = DEFAULT_TIMEZONE) {
    if (!a || !b) return false;
    return dateKeyInTimezone(a, timeZone) === dateKeyInTimezone(b, timeZone);
}
