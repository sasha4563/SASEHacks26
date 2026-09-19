create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text,
  age integer,
  gender text,
  photo_url text,
  description text,
  clothing text,
  last_seen_date timestamptz,
  last_seen_location text,
  status text not null default 'unverified' check (status in ('missing', 'found', 'unverified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_set_updated_at
before update on public.people
for each row
execute function public.set_updated_at();

alter table public.people enable row level security;