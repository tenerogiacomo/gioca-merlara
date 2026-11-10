-- Rafforzamento dopo la revisione di sicurezza di S3.

-- Lo storico delle prenotazioni (con le autocertificazioni) non si cancella insieme al profilo:
-- un profilo con prenotazioni non si può eliminare. La gestione delle richieste di cancellazione
-- dei dati personali si definirà con il titolare del trattamento.
alter table public.bookings drop constraint bookings_user_id_fkey;
alter table public.bookings
  add constraint bookings_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete restrict;

-- Nomi e sport degli slot occupati solo a chi ha un profilo completo (o al superadmin):
-- registrarsi con un numero di telefono non basta per vedere i nomi.
create or replace function public.occupied_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, sport_id text, first_name text)
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
    case when caller.can_see_names and b.ends_at > now() then b.sport_id end,
    case when caller.can_see_names and b.ends_at > now() then p.first_name end
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  cross join caller
  where b.status = 'active'
    and b.starts_at >= p_from
    and b.starts_at < p_to
    and p_to - p_from <= interval '31 days'
  order by b.starts_at;
$$;

-- Le funzioni e le sequenze create in futuro non sono eseguibili/utilizzabili da anon e
-- authenticated finché non lo si concede esplicitamente.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public
  revoke usage, select, update on sequences from anon, authenticated;
revoke usage, select, update on all sequences in schema public from anon, authenticated;

-- GraphQL non è usato: si disattiva, così non espone nemmeno i nomi di tabelle e colonne.
drop extension if exists pg_graphql;
