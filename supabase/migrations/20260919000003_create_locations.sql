create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text,
  latitude numeric,
  longitude numeric,
  address text,
  location_type text,
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;

create policy "Public can view locations"
on public.locations
for select
to anon, authenticated
using (true);

create policy "Public can submit locations"
on public.locations
for insert
to anon, authenticated
with check (true);