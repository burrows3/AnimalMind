# Waitlist email recovery

If waitlist signups didn’t appear in Supabase, use these steps to collect any emails from the last 24 hours.

## 1. From the backup file (server signups)

When the app is run with **`npm start`**, every waitlist submit is appended to **`memory/waitlist-backup.jsonl`** (one JSON line per signup). To list emails from the last 24 hours:

```bash
node scripts/collect-waitlist-last-24h.js
```

If the file doesn’t exist, no one has submitted via the server in this environment yet.

## 2. From Supabase (direct client signups)

If signups went **directly to Supabase** (e.g. static deploy with Supabase in CSP), run this in the Supabase **SQL Editor** (Dashboard → SQL Editor) to list rows from the last 24 hours:

```sql
SELECT email, created_at
FROM waitlist
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

Replace `waitlist` with your table name if different (e.g. from `VITE_SUPABASE_WAITLIST_TABLE`).

## Why signups might not have reached Supabase

- **CSP**: The server was sending `connect-src 'self'`, so the browser blocked the client from calling Supabase. This is fixed: the app now prefers **same-origin `/api/waitlist`**, which backs up locally and forwards to Supabase. CSP was also updated to allow `https://*.supabase.co` for static deploys.
- **RLS**: In Supabase, the `waitlist` table must allow **INSERT** for the `anon` role (e.g. policy: “Allow insert for anon” or “true” for insert).
- **Table**: Table must exist with at least `email` (text) and optionally `created_at` (timestamptz, default `now()`).

## Server env (optional)

To have the server forward signups to Supabase, set in the **server** `.env` (repo root, not frontend):

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_WAITLIST_TABLE` or `VITE_SUPABASE_WAITLIST_TABLE` (default: `waitlist`)

If these are not set, signups are still written to **`memory/waitlist-backup.jsonl`** so you can run `scripts/collect-waitlist-last-24h.js` to collect them.
