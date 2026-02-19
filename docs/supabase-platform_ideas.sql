-- Run this in Supabase SQL Editor to create the platform_ideas table.
-- Uses the same project as waitlist; same RLS pattern (anon can insert only).

create table if not exists public.platform_ideas (
  id uuid primary key default gen_random_uuid(),
  idea text not null,
  email text,
  source text,
  created_at timestamptz default now()
);

-- Optional: index for listing by date in dashboard
create index if not exists idx_platform_ideas_created_at on public.platform_ideas (created_at desc);

-- RLS: allow anonymous insert (so the frontend can submit), no public read/update/delete
alter table public.platform_ideas enable row level security;

drop policy if exists "Allow anon insert" on public.platform_ideas;
create policy "Allow anon insert" on public.platform_ideas
  for insert to anon with check (true);

-- Only service role or authenticated users you grant access to can read; anon cannot.
drop policy if exists "No anon read" on public.platform_ideas;
-- (No select policy for anon = anon cannot read. Use Supabase dashboard or service role to view.)

comment on table public.platform_ideas is 'User-submitted platform improvement ideas from landing, Pet, and Pro.';
