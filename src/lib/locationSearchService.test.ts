import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearLocationSearchCache, searchLocations } from './locationSearchService';

const makeJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('locationSearchService', () => {
  beforeEach(() => {
    clearLocationSearchCache();
    vi.restoreAllMocks();
  });

  it('returns primary results when available', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeJsonResponse([{ place_id: 1, lat: '1', lon: '2', display_name: 'Kanpur, India' }])
    );

    const out = await searchLocations('kanpur');

    expect(out.meta.strategy).toBe('primary');
    expect(out.results).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('q=kanpur');
  });

  it('falls back to city token when primary has no results', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeJsonResponse([]))
      .mockResolvedValueOnce(makeJsonResponse([{ place_id: 2, lat: '3', lon: '4', display_name: 'Kanpur, India' }]));

    const out = await searchLocations('ghanta ghar kanpur');

    expect(out.meta.strategy).toBe('fallback_city');
    if (out.meta.strategy === 'fallback_city') {
      expect(out.meta.fallbackCityQuery).toBe('kanpur');
    }
    expect(out.results).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('q=kanpur');
  });

  it('caches results to reduce duplicate API calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeJsonResponse([]));

    await searchLocations('  unknownplace  ');
    await searchLocations('unknownplace');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws user-friendly error on non-OK responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeJsonResponse({ error: 'no' }, 500));

    await expect(searchLocations('kanpur')).rejects.toThrow(/location search failed/i);
  });
});
