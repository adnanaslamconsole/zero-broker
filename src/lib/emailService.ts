import { supabase } from '@/lib/supabase';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

export type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  from?: string;
};

export type SendEmailResult = {
  id: string | null;
};

type FunctionInvokeErrorLike = {
  message?: string;
  context?: { status?: number };
};

type SendEmailFunctionResponse = {
  id?: string | null;
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const validateSendEmailParams = (params: SendEmailParams) => {
  const to = params.to.trim();
  const subject = params.subject.trim();
  const html = (params.html ?? '').trim();
  const text = (params.text ?? '').trim();
  const replyTo = (params.replyTo ?? '').trim();
  const from = (params.from ?? '').trim();

  if (!to || !isEmail(to)) throw new Error('Please enter a valid recipient email address');
  if (!subject || subject.length > 150) throw new Error('Please enter a valid subject (max 150 characters)');
  if (!html && !text) throw new Error('Please provide email content (HTML or text)');
  if (replyTo && !isEmail(replyTo)) throw new Error('Please enter a valid reply-to email address');
  if (html.length > 200_000 || text.length > 200_000) throw new Error('Email content is too long');
  if (from && !isEmail(from)) throw new Error('Please enter a valid from email address');

  return { to, subject, html: html || undefined, text: text || undefined, replyTo: replyTo || undefined, from: from || undefined };
};

const shouldRetryInvoke = (error: unknown) => {
  const e = error as FunctionInvokeErrorLike | null | undefined;
  const message = typeof e?.message === 'string' ? e.message.toLowerCase() : '';
  const status = typeof e?.context?.status === 'number' ? e.context.status : undefined;
  if (status && (status >= 500 || status === 429)) return true;
  if (message.includes('failed to fetch') || message.includes('network')) return true;
  return false;
};

export const sendEmail = async (params: SendEmailParams): Promise<SendEmailResult> => {
  const payload = validateSendEmailParams(params);

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload,
      });

      if (error) throw error;

      const response = data as SendEmailFunctionResponse | null;
      const id = response?.id ?? null;
      return { id: typeof id === 'string' ? id : null };
    } catch (error) {
      const retry = attempt < maxAttempts && shouldRetryInvoke(error);
      logError(error, { action: 'email.send' });
      if (retry) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }
      throw new Error(getUserFriendlyErrorMessage(error, { action: 'email.send' }) || 'Failed to send email');
    }
  }

  throw new Error('Failed to send email');
};
