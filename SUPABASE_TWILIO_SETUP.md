# Supabase + Twilio OTP Setup Guide

This guide explains how to configure Phone OTP (SMS) authentication for your project using Supabase and Twilio.

## Prerequisites

1.  **Supabase Project**: You have access to your Supabase project dashboard.
2.  **Twilio Account**: You have a Twilio account with an active phone number and SMS capabilities.

## Step 1: Configure Twilio

1.  Log in to your [Twilio Console](https://console.twilio.com/).
2.  Get your **Account SID** and **Auth Token** from the dashboard.
3.  Get your **Twilio Phone Number** (or Messaging Service SID).

## Step 2: Configure Supabase Auth

1.  Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Go to **Authentication** > **Providers**.
3.  Select **Phone**.
4.  Toggle "Enable Phone Provider".
5.  Select **Twilio** as the SMS Provider.
6.  Enter the credentials from Step 1:
    *   **Twilio Account SID**
    *   **Twilio Auth Token**
    *   **Twilio Message Service SID** (or your Twilio Phone Number)
7.  Click **Save**.

## Step 3: Verify OTP Configuration

1.  In Supabase Dashboard, go to **Authentication** > **URL Configuration**.
2.  Ensure your `Site URL` is set correctly (e.g., `http://localhost:8080` for local dev).
3.  (Optional) Under **Rate Limits**, you can adjust SMS limits to prevent abuse.

## How it works in the App

The frontend code uses the Supabase Client SDK to handle OTPs:

### Sending OTP
```typescript
const { error } = await supabase.auth.signInWithOtp({
  phone: '+917897773335', // Must include country code
});
```

### Verifying OTP
```typescript
const { error } = await supabase.auth.verifyOtp({
  phone: '+917897773335',
  token: '123456',
  type: 'sms',
});
```

## Testing

*   **Local Testing**: You can use the mock functionality implemented in `AuthContext.tsx` by using the phone number `9999999999` and OTP `123456`.
*   **Production**: Ensure your Twilio account has funds and is not in trial mode (or verify the target phone numbers if in trial mode).
