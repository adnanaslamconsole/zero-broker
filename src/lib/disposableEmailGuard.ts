import { supabase } from '@/lib/supabase';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

const CACHE_KEY = 'zb_disposable_email_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry = {
  disposable: boolean;
  checkedAt: number;
};

type Cache = Record<string, CacheEntry>;

const loadCache = (): Cache => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Cache;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const saveCache = (cache: Cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
};

export const getEmailDomain = (email: string) => {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
};

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isFunctionNotFoundError = (err: unknown) => {
  const anyErr = err as {
    context?: { status?: number };
    message?: string;
    details?: string;
  };
  const status = anyErr?.context?.status;
  const message = `${anyErr?.message ?? ''} ${anyErr?.details ?? ''}`.toLowerCase();
  return status === 404 || message.includes('requested function was not found') || message.includes('not_found');
};

export const checkDisposableEmail = async (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    return { disposable: false, domain: '', message: '' };
  }

  const domain = getEmailDomain(normalized);
  if (!domain) return { disposable: false, domain: '', message: '' };

  const cache = loadCache();
  const cached = cache[domain];
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return { disposable: cached.disposable, domain, message: '' };
  }

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('validate-email', {
        body: { email: normalized },
      });
      if (error) throw error;
      const payload = data as { disposable?: boolean; message?: string } | null;
      const disposable = Boolean(payload?.disposable);
      const message = typeof payload?.message === 'string' ? payload.message : '';
      cache[domain] = { disposable, checkedAt: Date.now() };
      saveCache(cache);
      return { disposable, domain, message };
    } catch (err) {
      logError(err, { action: 'email.validateDisposable' });
      if (import.meta.env.DEV && isFunctionNotFoundError(err)) {
        cache[domain] = { disposable: false, checkedAt: Date.now() };
        saveCache(cache);
        return { disposable: false, domain, message: '' };
      }
      if (attempt < maxAttempts) {
        await sleep(200 * 2 ** (attempt - 1));
        continue;
      }
      if (isFunctionNotFoundError(err)) {
        throw new Error('Email validation service is not deployed. Please deploy validate-email function.');
      }
      throw new Error(getUserFriendlyErrorMessage(err, { action: 'email.validateDisposable' }) || 'Email validation failed');
    }
  }

  return { disposable: false, domain, message: '' };
};

export const assertEmailNotDisposable = async (email: string) => {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) return;
  const { disposable, message } = await checkDisposableEmail(normalized);
  if (disposable) {
    throw new Error(
      message ||
        'Temporary or disposable email addresses are not accepted. Please use a permanent email address for account recovery and important updates.'
    );
  }
};
