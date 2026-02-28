# SQL Error Resolution: Ambiguous Column Reference

## Issue Description
A PostgreSQL error `ERROR: 42702: column reference 'slug' is ambiguous` was encountered in the migration script `20260301_add_slug_to_services.sql`. This occurred during an `UPDATE` operation involving a self-join on the `services` table.

## Root Cause Analysis
The error occurred on line 17 of the query:
```sql
UPDATE services s1
SET slug = slug || '-' || substring(id::text, 1, 4)
FROM services s2
WHERE s1.slug = s2.slug AND s1.id <> s2.id;
```

In the `SET` clause, `slug` and `id` were referenced without table aliases. Since the `UPDATE` involves two instances of the `services` table (`s1` and `s2`), PostgreSQL could not determine which table's columns were being referenced, even though `s1` is the target of the update.

## Resolution
The column references in the `SET` clause were explicitly qualified with the alias `s1` to specify the target table.

### Corrected Query:
```sql
UPDATE services s1
SET slug = s1.slug || '-' || substring(s1.id::text, 1, 4)
FROM services s2
WHERE s1.slug = s2.slug AND s1.id <> s2.id;
```

## Preventive Measures
To prevent similar issues in future SQL queries:
1. **Always use aliases** when performing joins or updates involving multiple tables (including self-joins).
2. **Explicitly qualify all columns** in the `SET`, `WHERE`, and `SELECT` clauses when aliases are present.
3. **Verify migration scripts** against a sample dataset that includes potential edge cases (like duplicate values that trigger conflict-handling logic).

## Verification
The fix was applied to [20260301_add_slug_to_services.sql](file:///Users/adnanaslam/github-workspace/zero-broker/supabase/migrations/20260301_add_slug_to_services.sql). This ensures that any service names that results in duplicate slugs will be properly handled by appending a portion of their unique ID, satisfying the unique constraint added later in the script.
