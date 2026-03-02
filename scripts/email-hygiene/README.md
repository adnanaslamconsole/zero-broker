# Email Hygiene Scripts

These scripts help you sync a disposable-domain blocklist and scan/flag users at scale.

## Environment

Set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (optional, for notifications)
- `EMAIL_FROM` (optional, for notifications)

## 1) Sync disposable domains into Supabase

```bash
node scripts/email-hygiene/sync-disposable-domains.mjs
```

## 2) Scan existing profiles and write a report

```bash
node scripts/email-hygiene/scan-profiles.mjs --out reports/disposable-scan.json
```

## 3) Flag/block disposable emails (rollback-safe)

```bash
node scripts/email-hygiene/flag-disposable.mjs --dry-run
node scripts/email-hygiene/flag-disposable.mjs --notify
```

## 4) Roll back a run

```bash
node scripts/email-hygiene/rollback-run.mjs --run <RUN_ID>
```

