-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Creates the waitlist table and allows anonymous inserts (for newsletter sign-up).

-- Table for newsletter / waitlist sign-ups
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz default now()
);

-- Optional: prevent duplicate emails (one sign-up per email)
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

-- Enable Row Level Security (RLS)
alter table public.waitlist enable row level security;

-- Policy: allow anyone to INSERT (anon key can add rows)
create policy "Allow anon insert"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- Policy: no public read (only you/dashboard should see rows via service role or auth)
create policy "No public read"
  on public.waitlist
  for select
  to anon
  using (false);

-- Grant usage so anon can insert
grant insert on public.waitlist to anon;
grant usage on schema public to anon;
