-- Prenotazioni di più ore (S6, decisione D2): l'esclusiva passa dall'unicità dell'inizio
-- alla non sovrapposizione degli intervalli di tempo delle prenotazioni attive.

drop index public.bookings_one_active_per_slot;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
  where (status = 'active');

-- Il calendario ha bisogno anche della fine di ogni prenotazione.
drop function public.occupied_slots(timestamptz, timestamptz);

create function public.occupied_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz, sport_id text, first_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select
      auth.uid() is not null
      and (
        exists (select 1 from public.profiles where id = auth.uid())
        or public.is_superadmin()
      ) as can_see_names
  )
  select
    b.starts_at,
    b.ends_at,
    case when caller.can_see_names and b.ends_at > now() then b.sport_id end,
    case when caller.can_see_names and b.ends_at > now() then p.first_name end
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  cross join caller
  where b.status = 'active'
    and b.starts_at < p_to
    and b.ends_at > p_from
    and p_to - p_from <= interval '31 days'
  order by b.starts_at;
$$;

revoke execute on function public.occupied_slots(timestamptz, timestamptz) from public;
grant execute on function public.occupied_slots(timestamptz, timestamptz) to anon, authenticated;
