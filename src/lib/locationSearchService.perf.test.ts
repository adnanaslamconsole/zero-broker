import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearLocationSearchCache, searchLocations } from './locationSearchService';

const makeJsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('locationSearchService perf characteristics', () => {
  beforeEach(() => {
    clearLocationSearchCache();
    vi.restoreAllMocks();
  });

  it('serves repeated identical queries from cache (1 network call)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse([]));

    await searchLocations('kanpur');
    await searchLocations('kanpur');
    await searchLocations('kanpur');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

