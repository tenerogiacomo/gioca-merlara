-- S7: blocchi della struttura, annulli d'ufficio ed eliminazione dello storico.

-- Motivo dell'annullo d'ufficio, mostrato a chi aveva prenotato.
alter table public.bookings
  add column cancel_reason text
  check (cancel_reason is null or char_length(cancel_reason) between 1 and 200);

-- Blocchi a mezz'ore (D1). I fusi di Roma sono a ore intere, quindi basta l'allineamento assoluto.
alter table public.blocks
  add constraint blocks_half_hour check (
    mod(extract(epoch from starts_at)::bigint, 1800) = 0
    and mod(extract(epoch from ends_at)::bigint, 1800) = 0
  ),
  add constraint blocks_reason_length check (reason is null or char_length(reason) between 1 and 200);

create index blocks_ends_at_idx on public.blocks (ends_at);
create index bookings_ends_at_idx on public.bookings (ends_at);

-- Un blocco e una prenotazione salvati nello stesso istante non devono passare entrambi:
-- il controllo dei blocchi sulle prenotazioni e la creazione dei blocchi si mettono in fila
-- con lo stesso lucchetto della transazione. Ogni istruzione successiva vede l'altro salvataggio.
create or replace function public.reject_booking_on_block() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' then
    perform pg_advisory_xact_lock(hashtext('gioca-merlara:blocchi'));
    if exists (
      select 1 from public.blocks bl
      where bl.starts_at < new.ends_at and bl.ends_at > new.starts_at
    ) then
      raise exception 'slot_blocked' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Blocco con annullo delle prenotazioni coinvolte (D2, D3). Restituisce:
--   {"status": "confirm", "booking_ids": [...]} se le prenotazioni attive coinvolte non
--     coincidono con quelle confermate: nulla viene salvato;
--   {"status": "created", "block_id": n, "cancelled": n} altrimenti.
create function public.create_block(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text,
  p_created_by uuid,
  p_confirmed_ids uuid[]
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_confirmed uuid[];
  v_block_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('gioca-merlara:blocchi'));

  if p_starts_at is null or p_ends_at is null or p_starts_at >= p_ends_at then
    raise exception 'block_invalid_period' using errcode = 'P0001';
  end if;
  if p_starts_at <= now() then
    raise exception 'block_in_past' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.status = 'active'
      and b.starts_at <= now()
      and b.starts_at < p_ends_at and b.ends_at > p_starts_at
  ) then
    raise exception 'block_hits_started_booking' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(b.id order by b.id), '{}') into v_ids
  from public.bookings b
  where b.status = 'active'
    and b.starts_at < p_ends_at and b.ends_at > p_starts_at;

  select coalesce(array_agg(distinct x order by x), '{}') into v_confirmed
  from unnest(coalesce(p_confirmed_ids, '{}')) as x;

  if v_ids <> v_confirmed then
    return jsonb_build_object('status', 'confirm', 'booking_ids', to_jsonb(v_ids));
  end if;

  update public.bookings
  set status = 'cancelled_by_admin', cancelled_at = now(), cancel_reason = nullif(p_reason, '')
  where id = any (v_ids);

  insert into public.blocks (starts_at, ends_at, reason, created_by)
  values (p_starts_at, p_ends_at, nullif(p_reason, ''), p_created_by)
  returning id into v_block_id;

  return jsonb_build_object(
    'status', 'created',
    'block_id', v_block_id,
    'cancelled', cardinality(v_ids)
  );
end;
$$;

-- Eliminazione dallo storico (D5b): solo prenotazioni concluse con inizio nel periodo, e solo
-- se coincidono esattamente con quelle del CSV scaricato. Altrimenti non elimina nulla.
create function public.delete_bookings(
  p_from timestamptz,
  p_to timestamptz,
  p_ids uuid[]
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_given uuid[];
begin
  perform pg_advisory_xact_lock(hashtext('gioca-merlara:blocchi'));

  select coalesce(array_agg(b.id order by b.id), '{}') into v_ids
  from public.bookings b
  where b.ends_at <= now()
    and (p_from is null or b.starts_at >= p_from)
    and (p_to is null or b.starts_at < p_to);

  select coalesce(array_agg(distinct x order by x), '{}') into v_given
  from unnest(coalesce(p_ids, '{}')) as x;

  if v_ids <> v_given then
    raise exception 'export_outdated' using errcode = 'P0001';
  end if;

  delete from public.bookings where id = any (v_ids);
  return cardinality(v_ids);
end;
$$;

-- Telefono di chi ha prenotato, per l'elenco del superadmin (D5).
create function public.user_phones(p_ids uuid[])
returns table (id uuid, phone text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.phone::text from auth.users u where u.id = any (p_ids);
$$;

revoke execute on function public.create_block(timestamptz, timestamptz, text, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.delete_bookings(timestamptz, timestamptz, uuid[]) from public, anon, authenticated;
revoke execute on function public.user_phones(uuid[]) from public, anon, authenticated;
grant execute on function public.create_block(timestamptz, timestamptz, text, uuid, uuid[]) to service_role;
grant execute on function public.delete_bookings(timestamptz, timestamptz, uuid[]) to service_role;
grant execute on function public.user_phones(uuid[]) to service_role;
