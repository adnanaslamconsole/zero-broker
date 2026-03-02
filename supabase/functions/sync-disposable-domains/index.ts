import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { parseDisposableDomainsText } from '../_shared/domainSync.ts';

type SyncBody = {
  sourceUrl?: string;
  sourceName?: string;
  dryRun?: boolean;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get('Authorization') ?? '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('sync-disposable-domains misconfigured', { requestId });
      return json(500, { error: 'Server misconfiguration' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json(401, { error: 'Not authenticated' });

    const { data: profileRow } = await userClient
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();
    const roles = (profileRow?.roles ?? []) as string[];
    if (!roles.includes('platform-admin')) return json(403, { error: 'Not authorized' });

    const body = (await req.json().catch(() => ({}))) as SyncBody;
    const sourceUrl =
      body.sourceUrl ??
      'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf';
    const sourceName = body.sourceName ?? 'github';
    const dryRun = Boolean(body.dryRun);

    const resp = await fetch(sourceUrl);
    if (!resp.ok) {
      console.error('sync-disposable-domains fetch failed', { requestId, status: resp.status });
      return json(502, { error: 'Failed to download domain list' });
    }

    const text = await resp.text();
    const { validDomains: domains, invalidDomains, duplicatesSkipped } = parseDisposableDomainsText(text);

    const runAt = new Date().toISOString();
    console.info('sync-disposable-domains parsed', {
      requestId,
      count: domains.length,
      invalid: invalidDomains.length,
      duplicatesSkipped,
      sourceUrl,
      sourceName,
      dryRun,
    });

    if (dryRun) {
      return json(200, { count: domains.length, sourceUrl, sourceName, dryRun: true });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: summary, error: syncError } = await adminClient.rpc('sync_disposable_email_domains', {
      p_source: sourceName,
      p_domains: domains,
      p_delete_stale: true,
      p_initiated_by: user.id,
    });

    if (syncError) {
      console.error('sync-disposable-domains rpc failed', { requestId, syncError });
      return json(500, { error: 'Synchronization failed' });
    }

    return json(200, { sourceUrl, sourceName, summary });
  } catch (error) {
    console.error('sync-disposable-domains unexpected error', { error: String(error) });
    return json(500, { error: 'Unexpected server error' });
  }
});
