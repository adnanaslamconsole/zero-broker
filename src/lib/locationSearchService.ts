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
  )}&limit=${limit}&addressdetails=1&countrycodes=in&viewbox=68.1,6.8,97.4,35.5&bounded=0`;

const fetchJson = async (url: string, signal?: AbortSignal) => {
  const res = await appFetch(url, {
    signal,
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'ZeroBroker-App/1.0', // Good practice for Nominatim
    },
  });

  if (!res.ok) {
    throw new Error(`Location search failed (${res.status})`);
  }

  const data = (await res.json()) as LocationResult[];
  
  // Prioritize city and administrative results for broad queries
  return data.sort((a, b) => {
    const aIsCity = a.type === 'city' || a.type === 'administrative' ? 0 : 1;
    const bIsCity = b.type === 'city' || b.type === 'administrative' ? 0 : 1;
    return aIsCity - bIsCity;
  });
};

export const searchLocations = async (query: string, signal?: AbortSignal) => {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) { // Lowered min length for better responsiveness
    return { results: [] as LocationResult[], meta: { strategy: 'none', queryUsed: normalized } as LocationSearchMeta };
  }

  const cached = cache.get(normalized.toLowerCase());
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return { results: cached.results, meta: cached.meta };
  }

  try {
    const primaryUrl = buildUrl(normalized, 8);
    const primaryResults = await fetchJson(primaryUrl, signal);

    if (primaryResults.length > 0) {
      const meta: LocationSearchMeta = { strategy: 'primary', queryUsed: normalized };
      cache.set(normalized.toLowerCase(), { createdAt: Date.now(), results: primaryResults, meta });
      return { results: primaryResults, meta };
    }

    // Smart Fallback: Try searching for just the city if a full address fails
    const tokens = normalized.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length > 1) {
      const cityOnly = tokens[tokens.length - 1]; // Assume last part is city/state
      const fallbackUrl = buildUrl(cityOnly, 6);
      const fallbackResults = await fetchJson(fallbackUrl, signal);
      
      if (fallbackResults.length > 0) {
        const meta: LocationSearchMeta = { strategy: 'fallback_city', queryUsed: normalized, fallbackCityQuery: cityOnly };
        cache.set(normalized.toLowerCase(), { createdAt: Date.now(), results: fallbackResults, meta });
        return { results: fallbackResults, meta };
      }
    }

    const meta: LocationSearchMeta = { strategy: 'none', queryUsed: normalized };
    cache.set(normalized.toLowerCase(), { createdAt: Date.now(), results: [], meta });
    return { results: [], meta };
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    console.error('Location search error:', error);
    return { results: [], meta: { strategy: 'none', queryUsed: normalized } as LocationSearchMeta };
  }
};

export const clearLocationSearchCache = () => {
  cache.clear();
};

