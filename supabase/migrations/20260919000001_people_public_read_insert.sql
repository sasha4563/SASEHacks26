create policy "Public can view people"
on public.people
for select
to anon, authenticated
using (true);

create policy "Public can submit people"
on public.people
for insert
to anon, authenticated
with check (true);