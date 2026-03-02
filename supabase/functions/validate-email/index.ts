import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';

type ValidateBody = {
  email?: string;
};

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '*';
  const requested = req.headers.get('Access-Control-Request-Headers');
  const allowHeaders =
    requested && requested.trim().length > 0
      ? requested
      : 'authorization, x-client-info, apikey, content-type';

  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getDomain = (email: string) => {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return json(req, 500, { error: { code: 'server_misconfigured', message: 'Server misconfiguration' } });
    }

    const body = (await req.json().catch(() => ({}))) as ValidateBody;
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !isEmail(email)) {
      return json(req, 400, { error: { code: 'invalid_email', message: 'Please enter a valid email address.' } });
    }

    const domain = getDomain(email);
    if (!domain) {
      return json(req, 400, { error: { code: 'invalid_email', message: 'Please enter a valid email address.' } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('disposable_email_domains')
      .select('domain')
      .eq('domain', domain)
      .maybeSingle();

    if (error) return json(req, 500, { error: { code: 'lookup_failed', message: 'Email validation failed.' } });

    const disposable = Boolean(data?.domain);
    return json(req, 200, {
      disposable,
      domain,
      ...(disposable
        ? {
            message:
              'Temporary or disposable email addresses are not accepted. Please use a permanent email address for account recovery and important updates.',
          }
        : {}),
    });
  } catch {
    return json(req, 500, { error: { code: 'unexpected_error', message: 'Unexpected server error.' } });
  }
});
