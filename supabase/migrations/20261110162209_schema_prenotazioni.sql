-- Schema della milestone 1: profili, configurazione (sport, orario, prezzi, blocchi) e prenotazioni.
-- I tipi di dominio in src/domain/types.ts sono la fonte di verità: questo schema si adegua.
-- Le regole che confrontano più righe (sovrapposizioni di orari e prezzi) stanno nel dominio.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  last_name text not null check (length(trim(last_name)) between 1 and 100),
  birth_date date not null,
  -- Codice fiscale normalizzato (maiuscolo, senza spazi): uno per persona.
  tax_code text not null unique check (tax_code ~ '^[A-Z0-9]{16}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.sports (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (length(trim(name)) between 1 and 60),
  active boolean not null default true,
  sort_order integer not null default 0
);

-- Orario settimanale: giorno ISO (1 = lunedì) e intervalli in ora locale di Roma; 24:00 ammesso.
create table public.opening_intervals (
  id bigint generated always as identity primary key,
  weekday smallint not null check (weekday between 1 and 7),
  opens time not null,
  closes time not null,
  check (opens < closes)
);

-- Prezzo dello slot intero (non a persona) per sport, giorni e fascia oraria; zero per le fasce gratuite.
create table public.price_rules (
  id bigint generated always as identity primary key,
  sport_id text not null references public.sports (id) on delete cascade,
  weekdays smallint[] not null check (
    cardinality(weekdays) > 0 and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  from_time time not null,
  to_time time not null,
  price_cents integer not null check (price_cents >= 0),
  check (from_time < to_time)
);

create index price_rules_sport_id_idx on public.price_rules (sport_id);

-- Periodi in cui la struttura non è prenotabile: una fascia o più giorni.
create table public.blocks (
  id bigint generated always as identity primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index blocks_period_idx on public.blocks (starts_at, ends_at);

create type public.booking_status as enum ('active', 'cancelled_by_user', 'cancelled_by_admin');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id text not null references public.sports (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents integer not null check (price_cents >= 0),
  status public.booking_status not null default 'active',
  -- Autocertificazione nella stessa riga: non esiste una prenotazione senza accettazione.
  autocert_version text not null check (length(autocert_version) > 0),
  autocert_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (starts_at < ends_at),
  check ((status = 'active') = (cancelled_at is null))
);

-- Esclusiva: al massimo una prenotazione attiva per slot.
create unique index bookings_one_active_per_slot on public.bookings (starts_at) where status = 'active';
create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_starts_at_idx on public.bookings (starts_at);
