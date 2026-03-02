# Resend Email (via Supabase) Setup

This app sends custom emails through a Supabase Edge Function that calls the Resend Email API. Your Supabase project can still use Resend SMTP for Auth emails; custom transactional emails are sent via the Edge Function to keep the API key off the client.

## 1) Configure secrets (in Supabase)

Set these in your Supabase project secrets:

- `RESEND_API_KEY`: your Resend API key
- `EMAIL_FROM`: a verified sender address (recommended)

Example:

```bash
supabase secrets set RESEND_API_KEY="re_..." EMAIL_FROM="no-reply@your-domain.com"
```

## 2) Deploy the function

```bash
supabase functions deploy send-email
```

Important:
- This function includes `verify_jwt = false` (so browser CORS preflight can succeed). The function still requires an authenticated user in code and blocks non-admin abuse.

## 3) Test from the app

- Ensure your user has the `platform-admin` role.
- Open **Admin Dashboard → Email** and send a test email.

Notes:
- Non-admin authenticated users are restricted to sending test emails only to their own account email to avoid abuse.
- The function retries transient failures (network/5xx/429) with exponential backoff.
