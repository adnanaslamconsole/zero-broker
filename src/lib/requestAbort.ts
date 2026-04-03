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

// URLs that support credentials (our own Express backend only).
// Supabase uses Access-Control-Allow-Origin: * which is INCOMPATIBLE with credentials: include.
const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL || 'http://localhost:3000';

const requiresCredentials = (url: string): boolean => {
  return url.startsWith(AUTH_SERVER_URL) || url.includes('localhost:3000') || url.startsWith('/api/');
};

export const appFetch = (input: FetchInput, init?: FetchInit & { clearStorage?: boolean }) => {
  if (init?.clearStorage) {
    clearNonAuthStorage();
  }
  
  const controller = getController();
  const signal = mergeSignals(controller.signal, init?.signal ?? null);
  
  // 1. Strict Cache-Control headers to bypass mobile/proxy caching
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  let finalInput = input;

  // 2. Determine URL string for feature detection
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const isSupabaseRequest = url.includes('supabase.co');

  // 3. Add timestamp-based cache busting for GET and HEAD requests (skip Supabase)
  const method = (init?.method || 'GET').toUpperCase();
  if ((method === 'GET' || method === 'HEAD') && !isSupabaseRequest) {
    const separator = url.includes('?') ? '&' : '?';
    const cacheBuster = `_t=${Date.now()}`;
    
    if (typeof input === 'string') {
      finalInput = `${url}${separator}${cacheBuster}`;
    } else if (input instanceof URL) {
      const newUrl = new URL(url);
      newUrl.searchParams.set('_t', Date.now().toString());
      finalInput = newUrl.toString();
    } else {
      const req = input as Request;
      const newUrl = req.url.includes('?') ? `${req.url}&${cacheBuster}` : `${req.url}?${cacheBuster}`;
      finalInput = new Request(newUrl, req);
    }
  }

  // 4. Only include credentials for our own Express backend.
  //    Supabase sets Access-Control-Allow-Origin: * which is INCOMPATIBLE with credentials: 'include'.
  const credentials: RequestCredentials = requiresCredentials(url) ? 'include' : 'same-origin';
  
  return fetch(finalInput, { 
    ...init, 
    headers,
    signal, 
    cache: 'no-store',
    credentials,
  }).then(response => {
    if (response.status === 401) {
      console.warn('[FetchInterceptor] 401 Detected. Dispatching unauthorized event.');
      window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: { url } }));
    }
    return response;
  });
};
