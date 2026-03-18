import { queryClient } from './queryClient';
import { clearExpiredItems } from './localStorageTTL';

// Increment this version whenever a significant change requires a cache clear
// (e.g., schema changes, aggregation changes, or to solve aggressive caching on mobile)
export const CACHE_VERSION = '2026.03.18.v2';
export const SECURITY_VERSION = '2026.03.18.s1'; // Triggers full clear including auth
export const VERSION_KEY = 'zerobroker_cache_version';
export const SECURITY_VERSION_KEY = 'zerobroker_security_version';

/**
 * Initializes the cache sync logic.
 * Compares current code version with the version stored in localStorage.
 * If they mismatch, it clears suspected stale data and triggers a QueryClient clear.
 */
export function initializeCacheSync() {
  try {
    // 0. Clear any expired TTL items from localStorage
    clearExpiredItems();

    const storedVersion = localStorage.getItem(VERSION_KEY);
    const storedSecurityVersion = localStorage.getItem(SECURITY_VERSION_KEY);
    
    // 1. Check for Security Reset (Full Clear)
    if (storedSecurityVersion !== SECURITY_VERSION) {
      console.warn(`[CacheSync] SECURITY VERSION mismatch. Full reset required.`);
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(SECURITY_VERSION_KEY, SECURITY_VERSION);
      localStorage.setItem(VERSION_KEY, CACHE_VERSION);
      window.location.reload();
      return;
    }

    // 2. Check for General Cache Reset (Selective Clear)
    if (storedVersion !== CACHE_VERSION) {
      console.log(`[CacheSync] Version mismatch detected. Local: ${storedVersion}, App: ${CACHE_VERSION}. Invalidating cache...`);
      
      // 1. Clear TanStack Query Cache
      queryClient.clear();
      
      // 2. Selective LocalStorage cleanup
      // All auth is now handled via HttpOnly cookies on the backend — no auth keys to preserve.
      const keysToKeep = [
        VERSION_KEY,
        SECURITY_VERSION_KEY,
        'user_settings', // Keep user preferences if any
        'zero_broker_property_draft', // Keep offline draft
      ];
      
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }

      const keysToRemove = allKeys.filter(key => !keysToKeep.some(k => key.includes(k)));
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore
        }
      });
      
      // 3. Clear SessionStorage
      try {
        sessionStorage.clear();
      } catch (e) {
        // Ignore
      }
      
      // 4. Update the stored version
      localStorage.setItem(VERSION_KEY, CACHE_VERSION);
      
      console.log('[CacheSync] Cache invalidated successfully.');
    } else {
      console.log(`[CacheSync] Cache version up to date: ${CACHE_VERSION}`);
    }
  } catch (error) {
    console.error('[CacheSync] Error initializing cache sync:', error);
  }
}

/**
 * Full cleanup for logout or repair
 */
export function clearAllAppData() {
  try {
    // 1. Clear query cache
    queryClient.clear();
    
    // 2. Clear all storage
    // We remove almost everything but can preserve the cache version to avoid double reloads
    const preservedKeys = [VERSION_KEY, SECURITY_VERSION_KEY];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !preservedKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        // Ignore
      }
    });
    
    sessionStorage.clear();
    
    console.log('[CacheSync] All app data cleared successfully.');
  } catch (error) {
    console.error('[CacheSync] Failed to clear app data:', error);
  }
}

/**
 * Manual trigger for a deep cache clear (e.g. for a "Repair App" button)
 */
export function forceDeepClear() {
  try {
    clearAllAppData();
    window.location.reload();
  } catch (e) {
    console.error('[CacheSync] Force clear failed:', e);
  }
}
