-- I blocchi diventano una garanzia del database, non solo un controllo dell'app:
-- una prenotazione attiva non può sovrapporsi a un periodo bloccato, nemmeno se il blocco
-- è stato aggiunto un istante prima del salvataggio della prenotazione.

create function public.reject_booking_on_block() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and exists (
    select 1 from public.blocks bl
    where bl.starts_at < new.ends_at and bl.ends_at > new.starts_at
  ) then
    raise exception 'slot_blocked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.reject_booking_on_block() from public, anon, authenticated;

create trigger bookings_reject_on_block
before insert or update of starts_at, ends_at, status on public.bookings
for each row execute function public.reject_booking_on_block();
