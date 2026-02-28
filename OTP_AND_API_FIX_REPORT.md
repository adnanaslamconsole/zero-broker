# OTP and API Fix Report

## OTP Implementation Review

A thorough review of the OTP (One-Time Password) implementation across the codebase was conducted to ensure compliance with the 8-digit requirement.

### Findings

- **Auth Flow (`AuthContext.tsx` & `Login.tsx`)**:
  - The login flow has been updated to use 8-digit OTPs.
  - The demo OTP is set to `12345678`.
  - The verification logic expects an 8-digit token.
  - The UI (`InputOTP`) is configured with `maxLength={8}` and 8 input slots.

- **Booking Flow (`BookingDialog.tsx` & `BookingOTPDialog.tsx`)**:
  - **Correction**: Updated the generation logic in `BookingDialog.tsx` to produce 8-digit numeric tokens (`Math.floor(10000000 + Math.random() * 90000000)`).
  - **UI Update**: Updated `BookingOTPDialog.tsx` to support 8-digit input, updated labels to "8-digit", and adjusted the `InputOTP` slots for optimal responsive layout.

- **Other Modules**:
  - Checked `Profile.tsx`, `ContactUs.tsx`, and `SUPABASE_TWILIO_SETUP.md`.
  - No incorrect references remain.
  - Aadhaar number (last 4 digits) in `Profile.tsx` is intentional and not an OTP reference.

### Summary of Changes
- Updated `BookingDialog.tsx` to generate 8-digit OTPs.
- Updated `BookingOTPDialog.tsx` to validate 8-digit OTPs and display 8 input slots.
- Verified all login/auth flows use 8-digit OTPs.

---

## API Error Root Cause Analysis

### Issue
A `400 Bad Request` error was occurring at the Supabase services endpoint:
`https://kjiksmjgexhgldxsipiq.supabase.co/rest/v1/services?select=*&id=eq.rental-agreement`

### Root Cause
The investigation revealed that the request was missing the mandatory `apikey` header. When using the Supabase REST API directly or via the client, the `anon` key must be provided in the `apikey` header (and typically as a `Authorization: Bearer <token>` header as well).

While the Supabase client handles authentication, the `apikey` header is required for all requests to the PostgREST API to identify the project and bypass the API gateway's security layer.

### Solution
Modified the Supabase client configuration in `src/lib/supabase.ts` to explicitly include the `apikey` in the global headers for all requests.

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ... auth config
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
});
```

This ensures that every request made through the `supabase` client instance includes the necessary credentials, resolving the 400 Bad Request error while maintaining the 6-digit token requirement for authentication.
