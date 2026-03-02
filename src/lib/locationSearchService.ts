import { appFetch } from '@/lib/requestAbort';

export interface LocationResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    state?: string;
  };
  type?: string;
}

export type LocationSearchMeta =
  | { strategy: 'primary'; queryUsed: string }
  | { strategy: 'fallback_city'; queryUsed: string; fallbackCityQuery: string }
  | { strategy: 'none'; queryUsed: string };

type CacheEntry = {
  createdAt: number;
  results: LocationResult[];
  meta: LocationSearchMeta;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const normalizeQuery = (q: string) => q.trim().replace(/\s+/g, ' ');

const buildUrl = (q: string, limit: number) =>
  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    q
  )}&limit=${limit}&addressdetails=1&countrycodes=in`;

const fetchJson = async (url: string, signal?: AbortSignal) => {
  const res = await appFetch(url, {
    signal,
    headers: {
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) {
    throw new Error(`Location search failed (${res.status})`);
  }

  return (await res.json()) as LocationResult[];
};

const extractFallbackCity = (q: string) => {
  const tokens = q
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length < 2) return '';
  return tokens[tokens.length - 1];
};

export const searchLocations = async (query: string, signal?: AbortSignal) => {
  const normalized = normalizeQuery(query);
  if (normalized.length < 3) {
    return { results: [] as LocationResult[], meta: { strategy: 'none', queryUsed: normalized } as LocationSearchMeta };
  }

  const cached = cache.get(normalized.toLowerCase());
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { results: cached.results, meta: cached.meta };
  }

  const primaryUrl = buildUrl(normalized, 8);
  const primaryResults = await fetchJson(primaryUrl, signal);

  if (primaryResults.length > 0) {
    const meta: LocationSearchMeta = { strategy: 'primary', queryUsed: normalized };
    cache.set(normalized.toLowerCase(), { createdAt: Date.now(), results: primaryResults, meta });
    return { results: primaryResults, meta };
  }

  const fallbackCity = extractFallbackCity(normalized);
  if (fallbackCity) {
    const fallbackUrl = buildUrl(fallbackCity, 6);
    const fallbackResults = await fetchJson(fallbackUrl, signal);
    const meta: LocationSearchMeta = fallbackResults.length
      ? { strategy: 'fallback_city', queryUsed: normalized, fallbackCityQuery: fallbackCity }
      : { strategy: 'none', queryUsed: normalized };
    cache.set(normalized.toLowerCase(), { createdAt: Date.now(), results: fallbackResults, meta });
    return { results: fallbackResults, meta };
  }

  const meta: LocationSearchMeta = { strategy: 'none', queryUsed: normalized };
  cache.set(normalized.toLowerCase(), { createdAt: Date.now(), results: [], meta });
  return { results: [], meta };
};

export const clearLocationSearchCache = () => {
  cache.clear();
};

