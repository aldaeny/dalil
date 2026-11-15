import type { Language, Place } from './types';

/**
 * Determines whether a place is currently open using Iraq Standard Time (Asia/Baghdad, UTC+3).
 */
export function isPlaceOpenNow(place: Pick<Place, 'is24Hours' | 'openTime' | 'closeTime'>, now = new Date()): boolean {
  if (place.is24Hours) return true;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baghdad',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '12');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const currentMinutes = (hour === 24 ? 0 : hour) * 60 + minute;

    const [openH, openM] = place.openTime.split(':').map(Number);
    const [closeH, closeM] = place.closeTime.split(':').map(Number);

    if (Number.isNaN(openH) || Number.isNaN(closeH)) return true;

    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    if (openMinutes === closeMinutes) return true;

    // Normal daytime schedule (e.g., 08:00 to 23:00)
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }

    // Cross-midnight schedule (e.g., 10:00 to 02:00)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  } catch {
    return true;
  }
}

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function formatDistance(km: number | undefined, lang: Language): string {
  if (km === undefined || Number.isNaN(km)) return '';
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000));
    return lang === 'ar' ? `${meters} م` : `${meters} m`;
  }
  return lang === 'ar' ? `${km.toFixed(1)} كم` : `${km.toFixed(1)} km`;
}

export function formatTime12h(time24: string, lang: Language): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr || '0');
  if (Number.isNaN(h)) return time24;

  const isPm = h >= 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minPadded = String(m).padStart(2, '0');
  if (lang === 'ar') {
    return `${hour12}:${minPadded} ${isPm ? 'م' : 'ص'}`;
  }
  return `${hour12}:${minPadded} ${isPm ? 'PM' : 'AM'}`;
}

export function formatHoursLabel(place: Pick<Place, 'is24Hours' | 'openTime' | 'closeTime'>, lang: Language): string {
  if (place.is24Hours) {
    return lang === 'ar' ? 'مفتوح 24 ساعة' : 'Open 24 Hours';
  }
  return `${formatTime12h(place.openTime, lang)} - ${formatTime12h(place.closeTime, lang)}`;
}

export function getGoogleMapsUrl(lat: number, lng: number, label?: string): string {
  const query = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatPriceLevel(level: 1 | 2 | 3, lang: Language): string {
  if (lang === 'ar') {
    if (level === 1) return 'اقتصادي';
    if (level === 2) return 'متوسط';
    return 'فاخر';
  }
  if (level === 1) return '$ · Budget';
  if (level === 2) return '$$ · Moderate';
  return '$$$ · Premium';
}
