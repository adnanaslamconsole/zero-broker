export type GeoPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export type GeoErrorType = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'unknown';

export type GeoPlatform = 'ios' | 'android' | 'other';

const CACHE_KEY = 'zb_geo_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000;

type GeoCache = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
};

export const detectPlatform = (): GeoPlatform => {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
};

export const isLikelyMobile = () => {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod|android/i.test(ua)) return true;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
  }
  return false;
};

export const loadCachedCoords = (): GeoCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCache;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;
    if (typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveCachedCoords = (coords: GeoCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(coords));
  } catch {
    // ignore
  }
};

export const clearCachedCoords = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
};

export const mapGeolocationError = (error: GeolocationPositionError): { type: GeoErrorType; message: string } => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        type: 'denied',
        message: 'Location access was denied. Enable location permissions to see nearby properties.',
      };
    case error.POSITION_UNAVAILABLE:
      return {
        type: 'unavailable',
        message: 'Location is unavailable. Check that location services are enabled and try again.',
      };
    case error.TIMEOUT:
      return {
        type: 'timeout',
        message: 'Location request timed out. Please try again.',
      };
    default:
      return {
        type: 'unknown',
        message: 'Unable to get your location. Please try again.',
      };
  }
};

