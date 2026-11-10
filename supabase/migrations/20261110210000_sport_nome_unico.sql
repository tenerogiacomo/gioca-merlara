-- Nomi degli sport unici senza distinguere maiuscole e minuscole: protegge anche da due
-- salvataggi contemporanei, oltre al controllo nell'app.
create unique index sports_name_unique_idx on public.sports (lower(name));
