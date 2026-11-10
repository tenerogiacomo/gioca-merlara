-- Regole di accesso. Principio: gli utenti, con o senza sessione, possono solo leggere.
-- Tutte le scritture passano dal server con la chiave secret, dopo i controlli di dominio.

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.opening_intervals enable row level security;
alter table public.price_rules enable row level security;
alter table public.blocks enable row level security;
alter table public.bookings enable row level security;

-- Difesa in profondità: oltre all'assenza di regole di scrittura, niente permessi di scrittura.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon, authenticated;
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- Superadmin: ruolo in app_metadata, che l'utente non può modificare da solo.
create function public.is_superadmin() returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin', false);
$$;

-- Dati personali: il titolare e il superadmin.
create policy "profili: titolare o superadmin"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_superadmin()));

create policy "prenotazioni: titolare o superadmin"
  on public.bookings for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_superadmin()));

-- Configurazione: non contiene dati personali e serve al calendario.
create policy "sport: lettura pubblica"
  on public.sports for select to anon, authenticated using (true);

create policy "orario: lettura pubblica"
  on public.opening_intervals for select to anon, authenticated using (true);

create policy "prezzi: lettura pubblica"
  on public.price_rules for select to anon, authenticated using (true);

-- Blocchi completi (con il motivo): solo superadmin. Gli orari sono esposti da blocked_periods().
create policy "blocchi: superadmin"
  on public.blocks for select to authenticated
  using ((select public.is_superadmin()));

-- Slot occupati per il calendario, su un intervallo di al massimo 31 giorni.
-- Senza sessione: solo l'inizio. Con sessione: anche sport e nome del prenotante,
-- solo per gli slot non ancora finiti. Mai cognome, telefono o codice fiscale.
create function public.occupied_slots(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, sport_id text, first_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.starts_at,
    case when auth.uid() is not null and b.ends_at > now() then b.sport_id end,
    case when auth.uid() is not null and b.ends_at > now() then p.first_name end
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  where b.status = 'active'
    and b.starts_at >= p_from
    and b.starts_at < p_to
    and p_to - p_from <= interval '31 days'
  order by b.starts_at;
$$;

-- Periodi bloccati per il calendario: solo inizio e fine, mai il motivo.
create function public.blocked_periods(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select bl.starts_at, bl.ends_at
  from public.blocks bl
  where bl.starts_at < p_to
    and bl.ends_at > p_from
    and p_to - p_from <= interval '31 days'
  order by bl.starts_at;
$$;

revoke execute on function public.occupied_slots(timestamptz, timestamptz) from public;
revoke execute on function public.blocked_periods(timestamptz, timestamptz) from public;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.occupied_slots(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.blocked_periods(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;
