import { clearNonAuthStorage } from './localStorageTTL';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

let globalController: AbortController | null = null;

const getController = () => {
  if (!globalController) globalController = new AbortController();
  return globalController;
};

const mergeSignals = (a: AbortSignal, b?: AbortSignal | null) => {
  if (!b) return a;
  const any = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  if (typeof any === 'function') return any([a, b]);
  const c = new AbortController();
  const onAbort = () => c.abort();
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return c.signal;
};

export const abortAllRequests = () => {
  if (globalController) {
    globalController.abort();
    globalController = null;
  }
};

export const appFetch = (input: FetchInput, init?: FetchInit & { clearStorage?: boolean }) => {
  if (init?.clearStorage) {
    clearNonAuthStorage();
  }
  
  const controller = getController();
  const signal = mergeSignals(controller.signal, init?.signal ?? null);
  
  // Add cache: 'no-store' to ensure browser doesn't reuse results
  return fetch(input, { ...init, signal, cache: 'no-store' });
};
