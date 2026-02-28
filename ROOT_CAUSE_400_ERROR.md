# Root Cause Analysis: 400 Bad Request at Supabase Services Endpoint

## Issue Description
A `400 Bad Request` error was occurring when attempting to fetch service details from the Supabase REST API using the following URL:
`https://kjiksmjgexhgldxsipiq.supabase.co/rest/v1/services?select=*&id=eq.rental-agreement`

## Root Cause
The root cause of the error was a **type mismatch** between the query parameter and the database column definition:

1.  **Database Schema**: The `id` column in the `services` table is defined as a `UUID` type.
2.  **Query Parameter**: The application was attempting to filter by `id=eq.rental-agreement`.
3.  **Conflict**: PostgREST (the API engine for Supabase) returns a `400 Bad Request` when a query filter value (like `'rental-agreement'`) does not match the data type of the column being filtered (like `UUID`).

The error message from PostgREST would have been:
`"invalid input syntax for type uuid: \"rental-agreement\""`

## Resolution Strategy
To resolve this while maintaining the ability to use human-readable URLs (like `/services/rental-agreement`), the following steps were implemented:

### 1. Database Schema Update
A new migration was created to add a `slug` column to the `services` table. This column is intended for human-readable identifiers.

- **Migration**: [20260301_add_slug_to_services.sql](file:///Users/adnanaslam/github-workspace/zero-broker/supabase/migrations/20260301_add_slug_to_services.sql)
- **Action**: Added `slug` column, updated existing records with slugs based on their names, and added a default `rental-agreement` service.

### 2. Application Logic Update
The `ServiceDetail` component was updated to handle both `UUID` and `slug` lookups.

- **File**: [ServiceDetail.tsx](file:///Users/adnanaslam/github-workspace/zero-broker/src/pages/ServiceDetail.tsx)
- **Logic**:
    - Check if the provided `id` parameter matches a UUID format.
    - If it is a UUID, query by the `id` column.
    - If it is NOT a UUID (e.g., `'rental-agreement'`), query by the `slug` column.

### 3. Authentication & Token Verification
- **Token Length**: Changed the mock OTP generation and verification logic from 8 digits to 6 digits to meet the new requirement.
- **API Impact**: This change does not affect API authentication, as the Supabase client handles the `apikey` and `Authorization` (JWT) headers independently of the OTP flow.

## Verification
-   The API query `?slug=eq.rental-agreement` is now valid and compliant with PostgREST syntax.
-   The frontend seamlessly handles both legacy UUID links and new slug-based links.
-   The 6-digit token requirement is enforced in both the sender (AuthContext) and the verifier (Login UI).
