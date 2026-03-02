import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';

type SendEmailBody = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const pickString = (...values: Array<unknown>) => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return '';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get('Authorization') ?? '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('send-email misconfigured', { requestId });
      return json(500, { error: 'Server misconfiguration' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      return json(401, { error: 'Not authenticated' });
    }

    const body = (await req.json()) as Partial<SendEmailBody>;
    const to = pickString(body.to).trim();
    const subject = pickString(body.subject).trim();
    const html = pickString(body.html);
    const text = pickString(body.text);
    const replyTo = pickString(body.replyTo).trim();

    if (!to || !isEmail(to)) return json(400, { error: 'Invalid recipient email address' });
    if (replyTo && !isEmail(replyTo)) return json(400, { error: 'Invalid reply-to email address' });
    if (!subject || subject.length > 150) return json(400, { error: 'Invalid subject' });
    if (!html && !text) return json(400, { error: 'Email content is required' });
    if (html.length > 200_000 || text.length > 200_000) return json(400, { error: 'Email content is too long' });

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();

    const roles = (profileRow?.roles ?? []) as string[];
    const isAdmin = roles.includes('platform-admin');
    if (!isAdmin && user.email && to.toLowerCase() !== user.email.toLowerCase()) {
      return json(403, { error: 'You can only send test emails to your own address' });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    if (!resendApiKey) {
      console.error('RESEND_API_KEY missing', { requestId });
      return json(500, { error: 'Email provider is not configured' });
    }

    const from = pickString(body.from, Deno.env.get('EMAIL_FROM'), 'onboarding@resend.dev').trim();
    if (!from || !isEmail(from)) return json(400, { error: 'Invalid from address' });

    const payload = {
      from,
      to,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    };

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId,
          },
          body: JSON.stringify(payload),
        });

        const textBody = await resp.text();
        const parsed = (() => {
          try {
            return JSON.parse(textBody) as Record<string, unknown>;
          } catch {
            return null;
          }
        })();

        if (resp.ok) {
          const id = pickString(parsed?.id);
          console.info('send-email success', { requestId, attempt, id });
          return json(200, { id });
        }

        const providerMessage = pickString(parsed?.message, parsed?.error, textBody);
        const shouldRetry = resp.status >= 500 || resp.status === 429;

        console.error('send-email provider error', {
          requestId,
          attempt,
          status: resp.status,
          message: providerMessage,
        });

        if (attempt < maxAttempts && shouldRetry) {
          await sleep(250 * 2 ** (attempt - 1));
          continue;
        }

        const userMessage =
          resp.status === 401 || resp.status === 403
            ? 'Email provider authentication failed. Please contact support.'
            : resp.status === 429
              ? 'Too many email requests. Please try again shortly.'
              : 'Failed to send email. Please try again.';

        return json(502, { error: userMessage });
      } catch (err) {
        console.error('send-email network error', { requestId, attempt, err });
        if (attempt < maxAttempts) {
          await sleep(250 * 2 ** (attempt - 1));
          continue;
        }
        return json(502, { error: 'Network error while sending email. Please try again.' });
      }
    }

    return json(500, { error: 'Failed to send email' });
  } catch (error) {
    console.error('send-email unexpected error', { requestId, error });
    return json(500, { error: 'Unexpected server error' });
  }
});

