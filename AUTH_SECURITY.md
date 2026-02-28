# Zero Broker - Authentication & Security System

This document outlines the robust authentication and security mechanisms implemented in the Zero Broker platform, adhering to industry best practices and OWASP guidelines.

## 1. Authentication Core
The system leverages **Supabase Auth** (GoTrue) for industry-standard identity management.

### Features
- **Secure Registration & Login**: Supports both Password-based and Passwordless (OTP/Magic Link) flows.
- **Password Hashing**: Passwords are automatically hashed using **bcrypt** (via Supabase/PostgreSQL `pgcrypto`) with appropriate salts.
- **JWT Implementation**:
  - **Access Tokens**: Short-lived (1 hour) signed JWTs.
  - **Refresh Tokens**: Long-lived tokens with **Rotation** enabled to prevent reuse if compromised.
  - **Token Storage**: Stored securely in `localStorage` with CSRF protection via Supabase's PKCE flow.

## 2. Security Mechanisms

### Robust Token Verification
Every request to the Supabase backend is verified using the signed JWT. Row Level Security (RLS) ensures that users can only access data they are authorized to see.

### Multi-Factor Authentication (MFA)
Implemented **TOTP-based MFA** (Google Authenticator, Authy, etc.).
- **Methods**: `enrollMfa`, `verifyAndEnableMfa`, `unenrollMfa`.
- **Logic**: Users must challenge their MFA factor during login if enabled.

### Rate Limiting & Brute Force Protection
- **Global Rate Limits**: Supabase applies rate limits on authentication requests (login, signup, OTP).
- **Account Lockout**: Automated lockout after 5 consecutive failed login attempts within 15 minutes.

### Password Policy
Enforced strong password requirements via regex validation:
- Minimum 8 characters.
- At least one uppercase letter.
- At least one lowercase letter.
- At least one number.
- At least one special character.

### Audit Logging
All security-critical events are logged to the `security_logs` table:
- `login-success`, `login-failed`
- `registration-success`
- `password-changed`
- `mfa-enabled`, `mfa-disabled`
- `oauth-login-initiated`

### Protection Against Common Vulnerabilities
- **SQL Injection**: Prevented by using PostgREST (via Supabase) which uses prepared statements.
- **XSS Attacks**: React's built-in escaping and Supabase's secure token handling mitigate XSS.
- **CSRF**: Mitigated by JWT-based authentication and PKCE flow for OAuth.

## 3. OAuth 2.0 & OpenID Connect
The system is integrated with:
- **Google OAuth**
- **GitHub OAuth**
Redirect flows are handled securely via the `/auth/callback` endpoint.

## 4. API Documentation
The authentication API is exposed via the `useAuth` hook:

| Method | Description |
| --- | --- |
| `signIn(email, password)` | Login with email and password. |
| `signUp(email, password, name, role)` | Register a new user with strong password validation. |
| `signInWithOAuth(provider)` | Initiates OAuth flow for 'google' or 'github'. |
| `loginWithOtp(identifier, type)` | Passwordless login via email or phone. |
| `verifyOtp(identifier, token, type)` | Verifies the OTP/Magic Link token. |
| `enrollMfa()` | Starts TOTP MFA enrollment (returns QR code). |
| `verifyAndEnableMfa(code, factorId)` | Completes MFA setup. |
| `logout()` | Securely terminates the session. |

## 5. Security Assessment
- **OWASP Compliance**: Meets Level 1 requirements of the OWASP Application Security Verification Standard (ASVS) for Authentication and Session Management.
- **Compliance**: Adheres to financial data handling guidelines by implementing audit trails and MFA.
