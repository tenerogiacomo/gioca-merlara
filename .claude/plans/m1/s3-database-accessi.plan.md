# Sotto-piano S3 — Database e regole di accesso

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s3-database-accessi` (da `main`, dopo il merge di S2)
**Richiede Task 0**: Sì (completato il 10 novembre 2026: progetto `gioca-merlara`, eu-central-1, 3 numeri di prova verificati, CLI collegata all'account)
**Revisione di sicurezza**: Sì
**Look and feel**: nessuna interfaccia
**Complessità**: Alta

## Obiettivo
Creare nel progetto Supabase le tabelle del servizio, con vincoli e regole di accesso che proteggano i dati personali **anche se qualcuno usa direttamente la chiave pubblica** visibile nel browser. Preparare i client Supabase per gli step successivi e gli script operativi (superadmin, dati di esempio, pulizia dei test).

## Decisioni (approvate il 10 novembre 2026)
| # | Decisione proposta |
|---|---|
| D1 | **Nessuna scrittura diretta dagli utenti.** Gli utenti, con o senza sessione, possono solo leggere. Tutte le scritture passano da server actions che verificano sessione e regole di dominio, e poi scrivono con la chiave di servizio (solo server). |
| D2 | **Configurazione leggibile da tutti**: sport, orario e prezzi non sono dati personali e servono al calendario. |
| D3 | **Slot occupati con nome del prenotante e sport**, blocchi solo come orari: due funzioni di sola lettura. Per gli slot occupati restituiscono inizio, sport e **solo il nome** (non cognome, telefono, codice fiscale), **visibili solo a chi ha effettuato l'accesso**; per i blocchi solo inizio e fine, mai il motivo. Le tabelle `bookings` e `blocks` restano leggibili solo dal titolare (le proprie prenotazioni) e dal superadmin. Il nome è un dato personale: va citato nell'informativa privacy (domanda aperta del Direttivo sul titolare del trattamento). |
| D4 | **Superadmin** riconosciuto da `app_metadata.role = "superadmin"`, modificabile solo con la chiave di servizio. Il primo superadmin si assegna con uno script, al numero di prova del superadmin. |
| D5 | **Un profilo per codice fiscale**: il codice fiscale è unico, così la stessa persona non apre più profili. |
| D6 | **Annulli come cambio di stato**, non cancellazione: la prenotazione resta nello storico come annullata dall'utente o d'ufficio. Servirà anche per i voucher della milestone 2. |
| D7 | **Dati di esempio con uno script**, ripetibile: orario 9–23, sport calcetto, tennis e basket, prezzi **finti e dichiarati come tali**. I valori reali li configura il superadmin in S5. |
| D8 | **Tipi generati dal database e committati**, con funzioni di conversione verso i tipi di dominio di S2: lo schema segue il dominio, non il contrario. |

## Specifiche

### Tabelle (schema `public`)
| Tabella | Contenuto | Vincoli principali |
|---|---|---|
| `profiles` | nome, cognome, data di nascita, codice fiscale; collegata all'utente di Supabase Auth | chiave = id dell'utente; codice fiscale unico e in formato normalizzato |
| `sports` | id leggibile (es. `calcetto`), nome, attivo, ordine | id unico |
| `opening_intervals` | giorno della settimana, apertura, chiusura | giorno 1–7; apertura prima della chiusura; `24:00` ammesso |
| `price_rules` | sport, giorni, dalle, alle, prezzo in centesimi | prezzo intero ≥ 0; giorni 1–7, almeno uno |
| `blocks` | inizio, fine, motivo, chi l'ha creato | fine dopo inizio |
| `bookings` | utente, sport, inizio, fine, prezzo, stato, versione e momento dell'autocertificazione, momento dell'annullo | stato `active`, `cancelled_by_user`, `cancelled_by_admin`; autocertificazione obbligatoria; **unicità parziale sull'inizio per le prenotazioni attive** |

Le regole che richiedono confronti tra righe (sovrapposizioni di orari e prezzi) restano nel dominio di S2 e si applicano nelle server actions di S5.

### Regole di accesso
- Row Level Security attiva su tutte le tabelle.
- Permessi di scrittura revocati a `anon` e `authenticated` su tutte le tabelle, oltre all'assenza di regole di scrittura.
- Funzione `is_superadmin()` che legge `app_metadata` dal token.
- Lettura:

| Tabella | Chi legge |
|---|---|
| `profiles`, `bookings` | il titolare e il superadmin |
| `sports`, `opening_intervals`, `price_rules` | tutti |
| `blocks` | solo il superadmin |

- Funzioni di sola lettura con `search_path` vuoto:
  - `occupied_slots(dal, al)`: inizio, sport e nome del prenotante, solo per chi ha una sessione; senza sessione solo gli orari ("occupato");
  - `blocked_periods(dal, al)`: solo inizio e fine.

### Client Supabase (`src/lib/supabase/`)
- **Server**: con la sessione dell'utente dai cookie, per le letture.
- **Browser**: per le pagine che ne hanno bisogno.
- **Servizio**: con la chiave di servizio, marcato `server-only`, così la build fallisce se un componente del browser lo importa.
- **`src/proxy.ts`**: aggiornamento della sessione a ogni richiesta, secondo la guida di Next.js 16 inclusa nel pacchetto e la guida attuale di Supabase per Next.js.

### Script (`scripts/`, eseguiti con `tsx` e `--env-file=.env.local`)
- `assign-superadmin`: assegna il ruolo al numero indicato.
- `seed-dev`: dati di esempio (D7), ripetibile senza duplicati.
- `reset-test-data`: cancella prenotazioni e profili dei soli 3 utenti di prova.

### Test del database (`npm run test:db`, solo in locale)
Configurazione Vitest separata, contro il progetto di sviluppo, con pulizia all'inizio. Verifica:
1. una seconda prenotazione attiva sullo stesso slot viene rifiutata; una annullata non blocca la successiva;
2. un inserimento o una modifica diretti su prenotazioni e profili con la sessione dell'utente vengono rifiutati;
3. un utente non legge profili e prenotazioni di un altro; senza sessione non si legge nessuna prenotazione;
4. le funzioni degli slot occupati e dei blocchi restituiscono solo i campi previsti (nome e sport, nessun altro dato personale; nessun motivo dei blocchi) e solo a chi è autorizzato;
5. un utente non può darsi il ruolo superadmin modificando i propri metadati;
6. il superadmin assegnato dallo script legge tutto;
7. chiunque legge sport, orario e prezzi.

## Sottotask

### 3.1 Branch e stato del piano
- **Azione**: branch da `main` aggiornato; S2 `complete` e S3 `in-progress` nel piano padre; nomi delle variabili dei numeri di prova in `.env.example`.
- **Verifica**: `git status` pulito.

### 3.2 Collegamento della CLI e verifica senza Docker
- **Azione**: `supabase init` e `supabase link` al progetto; verificare che `migration new`, `db push` e `gen types --linked` funzionino senza Docker. Verificare sulla documentazione attuale se conviene passare alle nuove chiavi `sb_publishable_` / `sb_secret_`.
- **Verifica**: una migrazione vuota applicata al progetto remoto; esito sulle chiavi annotato nel piano.
- **Esito (10 novembre 2026)**: con la CLI 3.1 i comandi verso il progetto richiedono `--remote`; `link`, `migration new`, `db push --remote` e `gen types --remote` funzionano senza Docker. Le chiavi classiche `anon` e `service_role` saranno dismesse da Supabase entro la fine del 2026: l'app usa le nuove `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`, già presenti nel progetto e verificate. Le chiavi classiche vanno disattivate dal pannello quando tutto funziona con le nuove (prima del lancio).

### 3.3 Schema e vincoli
- **Azione**: migrazione con le tabelle e i vincoli delle specifiche.
- **Verifica**: `db push` riuscito; test 1 e 7.

### 3.4 Regole di accesso
- **Azione**: migrazione con Row Level Security, revoca dei permessi di scrittura, `is_superadmin()`, regole di lettura e funzioni di sola lettura.
- **Verifica**: test 2–6; nessun avviso di sicurezza nel controllo integrato di Supabase (Security Advisor), o avvisi motivati.

### 3.5 Tipi e conversioni
- **Azione**: tipi generati in `src/types/database.ts`; conversioni tra righe del database e tipi di dominio di S2 (orari, regole di prezzo, blocchi, slot occupati).
- **Verifica**: test unitari delle conversioni in `npm test`.

### 3.6 Client Supabase e proxy
- **Azione**: client server, browser e servizio; `src/proxy.ts`. Prima di scrivere: guida di Next.js 16 su proxy e autenticazione con Cache Components, guida Supabase SSR attuale.
- **Verifica**: `npm run build` passa; un import del client di servizio da un componente client fa fallire la build.

### 3.7 Script operativi
- **Azione**: `assign-superadmin`, `seed-dev`, `reset-test-data`; script npm corrispondenti.
- **Verifica**: lanciati due volte di seguito danno lo stesso risultato; il superadmin di prova ha il ruolo.

### 3.8 Test del database
- **Azione**: configurazione `vitest.db.config.mts`, test 1–7 in `tests/db/`, script `test:db`.
- **Verifica**: `npm run test:db` passa in locale.

### 3.9 Documentazione
- **Azione**: README, con una sezione in linguaggio semplice su migrazioni, dati di esempio, superadmin e pulizia dei test; `.env.example` aggiornato.
- **Verifica**: i comandi del README funzionano partendo da zero.

### 3.10 Revisione e pull request
- **Azione**: agente `security-reviewer` su migrazioni, client e script; `/code-review`; pull request; merge dopo l'ok del committente.
- **Verifica**: nessun problema critico o grave aperto; CI verde.

## File coinvolti
| File | Azione |
|---|---|
| `supabase/config.toml`, `supabase/migrations/*.sql` | CREATE |
| `src/types/database.ts` | CREATE (generato) |
| `src/lib/supabase/server.ts`, `browser.ts`, `service.ts` | CREATE |
| `src/proxy.ts` | CREATE |
| `src/server/db/mappers.ts` e test | CREATE |
| `scripts/assign-superadmin.ts`, `seed-dev.ts`, `reset-test-data.ts` | CREATE |
| `vitest.db.config.mts`, `tests/db/*.test.ts` | CREATE |
| `package.json`, `.env.example`, `README.md` | UPDATE |
| `.claude/plans/prenotazione-regolamentata.plan.md` | UPDATE (stati, esito sulle chiavi) |

## Criteri di uscita
- [ ] Migrazioni applicate al progetto di sviluppo e versionate in git
- [ ] `npm run test:db` passa (test 1–7)
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build` passano in locale e su GitHub
- [ ] Il client di servizio non può finire nel browser
- [ ] Revisione di sicurezza senza problemi critici o gravi aperti
- [ ] README con le istruzioni operative

## Rischi
| Rischio | Mitigazione |
|---|---|
| Un comando della CLI richiede Docker | Verifica nel 3.2; ripiego: migrazioni applicate con `db push --db-url`, tipi generati via API |
| Regole di accesso scritte male espongono dati | Test 2–6, Security Advisor, revisione di sicurezza |
| I test lasciano dati sporchi nel progetto di sviluppo | Pulizia all'inizio di ogni esecuzione, limitata ai 3 utenti di prova |
| La chiave di servizio finisce nel browser | Modulo `server-only` e verifica in build |
| Cache Components di Next.js 16 interferisce con le sessioni | Lettura della guida dedicata prima del 3.6 |

## Rollback
Codice: revert della pull request. Database: migrazione correttiva; il progetto di sviluppo contiene solo dati di prova e può essere ripulito.
