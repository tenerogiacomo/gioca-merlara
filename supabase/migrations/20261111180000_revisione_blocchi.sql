-- Correzioni dalla revisione del database (S7).

-- Allineamento a mezz'ore senza arrotondare i secondi frazionari.
alter table public.blocks drop constraint blocks_half_hour;
alter table public.blocks
  add constraint blocks_half_hour check (
    mod(extract(epoch from starts_at), 1800) = 0
    and mod(extract(epoch from ends_at), 1800) = 0
  );

-- I blocchi sono pochi e c'è già blocks_period_idx.
drop index public.blocks_ends_at_idx;

-- create_block: errore leggibile per orari non allineati; l'annullo tocca solo prenotazioni
-- ancora attive, così un annullo dell'utente avvenuto nel frattempo resta suo.
create or replace function public.create_block(
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
  v_cancelled integer;
  v_block_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('gioca-merlara:blocchi'));

  if p_starts_at is null or p_ends_at is null or p_starts_at >= p_ends_at then
    raise exception 'block_invalid_period' using errcode = 'P0001';
  end if;
  if mod(extract(epoch from p_starts_at), 1800) <> 0
    or mod(extract(epoch from p_ends_at), 1800) <> 0 then
    raise exception 'block_not_aligned' using errcode = 'P0001';
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

  if not (v_ids <@ coalesce(p_confirmed_ids, '{}')) then
    return jsonb_build_object('status', 'confirm', 'booking_ids', to_jsonb(v_ids));
  end if;

  update public.bookings
  set status = 'cancelled_by_admin', cancelled_at = now(), cancel_reason = nullif(p_reason, '')
  where id = any (v_ids) and status = 'active';
  get diagnostics v_cancelled = row_count;

  insert into public.blocks (starts_at, ends_at, reason, created_by)
  values (p_starts_at, p_ends_at, nullif(p_reason, ''), p_created_by)
  returning id into v_block_id;

  return jsonb_build_object(
    'status', 'created',
    'block_id', v_block_id,
    'cancelled', v_cancelled
  );
end;
$$;

-- delete_bookings: elimina solo le prenotazioni indicate, purché tutte concluse e nel periodo.
-- Una prenotazione che finisce tra il download e la conferma non fa fallire l'eliminazione.
create or replace function public.delete_bookings(
  p_from timestamptz,
  p_to timestamptz,
  p_ids uuid[]
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_given uuid[] := coalesce(p_ids, '{}');
  v_deleted integer;
begin
  select coalesce(array_agg(b.id), '{}') into v_ids
  from public.bookings b
  where b.ends_at <= now()
    and (p_from is null or b.starts_at >= p_from)
    and (p_to is null or b.starts_at < p_to);

  if not (v_given <@ v_ids) then
    raise exception 'export_outdated' using errcode = 'P0001';
  end if;

  delete from public.bookings where id = any (v_given);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.create_block(timestamptz, timestamptz, text, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.delete_bookings(timestamptz, timestamptz, uuid[]) from public, anon, authenticated;
grant execute on function public.create_block(timestamptz, timestamptz, text, uuid, uuid[]) to service_role;
grant execute on function public.delete_bookings(timestamptz, timestamptz, uuid[]) to service_role;
