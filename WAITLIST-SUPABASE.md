# Waitlist → Supabase checklist

If signups don’t appear in Supabase, check the following in the **Supabase Dashboard** (Table Editor + Authentication → Policies).

## 1. Table

- **Name:** `waitlist` (or set `SUPABASE_WAITLIST_TABLE` in env to match).
- **Columns** (minimum):
  - `id` – uuid, primary key, default: `gen_random_uuid()` (or leave auto).
  - `email` – text, not null (we send only `email`).
  - `created_at` – timestamptz, default: `now()` (optional; add if you want it).

We only send `{ "email": "..." }`. Any extra columns should have defaults.

## 2. RLS (Row Level Security)

- Go to **Table Editor** → select `waitlist` → **Policies** (or **Authentication** → **Policies**).
- RLS is usually **enabled** on the table. You need at least one policy that **allows INSERT** for the role that calls the API:
  - If the app uses the **anon** key: add a policy for role `anon` that allows **INSERT** (e.g. “Allow anonymous inserts”).
  - If the app uses the **service_role** key: RLS is bypassed; no policy needed.

Example policy (anon insert):

- **Policy name:** e.g. `Allow anon insert`
- **Allowed operation:** INSERT
- **Target roles:** `anon`
- **USING expression:** leave empty for insert-only
- **WITH CHECK expression:** `true` (or e.g. `email IS NOT NULL`)

After saving, try a signup again. If it still fails, check the **server logs** (or browser Network tab when calling `/api/waitlist`); the server now returns and logs Supabase error responses.
