export interface TTLData<T> {
  value: T;
  expiry: number; // timestamp in ms
}

/**
 * Sets an item in localStorage with a Time To Live (TTL).
 * @param key The key to store the data under.
 * @param value The value to store.
 * @param ttlMinutes The time to live in minutes.
 */
export function setItemWithTTL<T>(key: string, value: T, ttlMinutes: number): void {
  const now = Date.now();
  const ttlMs = ttlMinutes * 60 * 1000;
  const data: TTLData<T> = {
    value,
    expiry: now + ttlMs,
  };
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Gets an item from localStorage, checking for expiration.
 * If the item has expired, it is removed and null is returned.
 * @param key The key to retrieve the data for.
 * @returns The stored value or null if not found or expired.
 */
export function getItemWithTTL<T>(key: string): T | null {
  const rawData = localStorage.getItem(key);
  if (!rawData) return null;

  try {
    const data: TTLData<T> = JSON.parse(rawData);
    const now = Date.now();

    if (now > data.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return data.value;
  } catch (error) {
    console.error(`Error parsing localStorage data for key "${key}":`, error);
    // If it's not in the expected TTL format, we might want to return null or the raw data
    // For safety in migration, we return null and let the app refetch
    return null;
  }
}

/**
 * Removes an item from localStorage.
 */
export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clears expired items from localStorage based on their TTL.
 * This can be run on app initialization.
 */
export function clearExpiredItems(): void {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const rawData = localStorage.getItem(key);
    if (!rawData) continue;

    try {
      const data = JSON.parse(rawData);
      if (data && typeof data === 'object' && 'expiry' in data) {
        const now = Date.now();
        if (now > data.expiry) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      // Not a JSON or not a TTL object, ignore
    }
  }
}

/**
 * Selective localStorage clear that preserves authentication tokens.
 * Use this to fulfill the requirement of clearing old data with new API calls
 * without logging the user out.
 */
export function clearNonAuthStorage(): void {
  const keysToKeep = [
    'sb-kjiksmjgexhgldxsipiq-auth-token', // Supabase token
    'zerobroker-auth-session',            // Supabase session
    'zerobroker_cache_version',           // Version key
  ];

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const isAuth = keysToKeep.some(k => key.includes(k));
    if (!isAuth) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear();
  console.log('[Storage] Non-auth storage cleared.');
}
