import { describe, expect, it, vi } from 'vitest';
import { abortAllRequests, appFetch } from './requestAbort';

describe('requestAbort', () => {
  it('aborts in-flight fetches when abortAllRequests is called', async () => {
    const originalFetch = globalThis.fetch;
    let capturedSignal: AbortSignal | undefined;

    const mockedFetch: typeof fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Response('ok');
    };

    globalThis.fetch = vi.fn(mockedFetch) as unknown as typeof fetch;

    await appFetch('https://example.com');
    expect(capturedSignal).toBeTruthy();
    expect(capturedSignal?.aborted).toBe(false);

    abortAllRequests();
    expect(capturedSignal?.aborted).toBe(true);

    globalThis.fetch = originalFetch;
  });
});
