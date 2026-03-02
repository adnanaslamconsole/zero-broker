import { createClient } from '@supabase/supabase-js';
import { appFetch } from '@/lib/requestAbort';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kjiksmjgexhgldxsipiq.supabase.co';
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaWtzbWpnZXhoZ2xkeHNpcGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODU2MzgsImV4cCI6MjA4NDA2MTYzOH0.jmXDYy9JB7xW5wzelUqLxbAahEpCZHRpJ2CzL9z8goY';

export const createSupabaseClient = (options?: { fetch?: typeof fetch }) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'zerobroker-auth-session',
    },
    global: {
      headers: {
        apikey: supabaseAnonKey,
      },
      fetch: options?.fetch ?? appFetch,
    },
  });
};

export const supabase = createSupabaseClient();
