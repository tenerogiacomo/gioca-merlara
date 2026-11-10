-- Salvataggi tutto-o-niente della configurazione (S5): ogni funzione cancella e reinserisce
-- in un'unica transazione. Se un dato non è valido, i vincoli delle tabelle fanno fallire
-- tutto e la configurazione precedente resta intatta. Eseguibili solo con la chiave secret.

create function public.replace_opening_intervals(p_intervals jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.opening_intervals where true;
  insert into public.opening_intervals (weekday, opens, closes)
  select
    (item ->> 'weekday')::smallint,
    (item ->> 'opens')::time,
    (item ->> 'closes')::time
  from jsonb_array_elements(p_intervals) as item;
end;
$$;

create function public.replace_price_rules(p_sport_id text, p_rules jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.price_rules where sport_id = p_sport_id;
  insert into public.price_rules (sport_id, weekdays, from_time, to_time, price_cents)
  select
    p_sport_id,
    array(select jsonb_array_elements_text(item -> 'weekdays')::smallint),
    (item ->> 'from')::time,
    (item ->> 'to')::time,
    (item ->> 'priceCents')::integer
  from jsonb_array_elements(p_rules) as item;
end;
$$;

revoke execute on function public.replace_opening_intervals(jsonb) from public, anon, authenticated;
revoke execute on function public.replace_price_rules(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_opening_intervals(jsonb) to service_role;
grant execute on function public.replace_price_rules(text, jsonb) to service_role;
