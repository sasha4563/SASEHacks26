create table public.reports (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  report_type text not null,
  description text,
  location text,
  reported_at timestamptz not null default now(),
  event_date timestamptz,
  source text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified')),
  created_at timestamptz not null default now()
);

create index reports_person_id_idx on public.reports(person_id);

alter table public.reports enable row level security;

create policy "Public can view reports"
on public.reports
for select
to anon, authenticated
using (true);

create policy "Public can submit reports"
on public.reports
for insert
to anon, authenticated
with check (true);