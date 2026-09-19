create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete set null,
  location_id uuid not null references public.locations(id) on delete restrict,
  description text,
  sighting_date timestamptz,
  photo_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified')),
  created_at timestamptz not null default now()
);

create index sightings_person_id_idx on public.sightings(person_id);
create index sightings_location_id_idx on public.sightings(location_id);

alter table public.sightings enable row level security;

create policy "Public can view sightings"
on public.sightings
for select
to anon, authenticated
using (true);

create policy "Public can submit sightings"
on public.sightings
for insert
to anon, authenticated
with check (true);