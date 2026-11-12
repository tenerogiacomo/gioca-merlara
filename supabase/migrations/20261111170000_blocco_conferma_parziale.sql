-- La conferma di un blocco resta valida se nel frattempo una delle prenotazioni confermate
-- è stata annullata: si chiede di nuovo solo se c'è una prenotazione attiva non confermata.
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

  if not (v_ids <@ coalesce(p_confirmed_ids, '{}')) then
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

revoke execute on function public.create_block(timestamptz, timestamptz, text, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.create_block(timestamptz, timestamptz, text, uuid, uuid[]) to service_role;
