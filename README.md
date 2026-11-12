# Gioca Merlara

Servizio web per prenotare la piattaforma polivalente di Merlara e accedervi in autonomia, senza personale in loco. Curato da NEOS APS.

Requisiti e decisioni di prodotto: [`.claude/prds/gioca-merlara.prd.md`](.claude/prds/gioca-merlara.prd.md). Piano della milestone 1: [`.claude/plans/prenotazione-regolamentata.plan.md`](.claude/plans/prenotazione-regolamentata.plan.md).

## Requisiti

- Node.js 24 o successivo (npm incluso)
- Un progetto Supabase, necessario dallo step S3 in poi

## Avvio

```bash
npm install
cp .env.example .env.local   # poi compila i valori
npm run dev                  # http://localhost:3000
```

Per i test end-to-end serve una volta sola il browser di Playwright:

```bash
npx playwright install chromium
```

### Variabili d'ambiente

Tutte le variabili sono descritte in [`.env.example`](.env.example). Dal pannello Supabase:

| Variabile                              | Dove si trova                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project Settings → Data API → Project URL                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → chiave `publishable` (`sb_publishable_…`)         |
| `SUPABASE_SECRET_KEY`                  | Project Settings → API Keys → chiave `secret` (`sb_secret_…`, solo server)      |
| `SUPABASE_DB_PASSWORD`                 | Scelta alla creazione del progetto; si reimposta da Project Settings → Database |
| `TEST_PHONE_*`, `TEST_OTP_*`           | Authentication → Sign In / Providers → Phone → Test Phone Numbers and OTPs      |

I nomi delle voci del pannello possono cambiare nel tempo. `.env.local` non va mai in git.

## Runbook: gestire il servizio in parole semplici

Questa sezione è per chi non conosce il backend. I comandi si lanciano da un terminale aperto nella cartella del progetto.

### Provarlo sul computer

1. `npm install` (solo la prima volta o dopo un aggiornamento).
2. Controlla che esista `.env.local` con i valori del progetto Supabase di sviluppo.
3. `npm run dev`, poi apri http://localhost:3000. Per vederlo come su smartphone usa la vista mobile degli strumenti per sviluppatori del browser.

Per provarlo sul telefono, collegato alla stessa rete Wi-Fi: `npm run dev -- -H 0.0.0.0`, poi apri `http://<indirizzo-IP-del-computer>:3000`.

### Numeri di prova

In sviluppo non partono SMS veri. Si accede con i numeri di prova di `.env.local` (`TEST_PHONE_*`), scritti senza `+39` (es. `333 000 0001`), e il loro codice fisso (`TEST_OTP_*`).

- **Utente A e utente B**: persone che prenotano. Al primo accesso chiedono il profilo; per prova va bene Mario Rossi, nato il 10/12/1985, codice fiscale `RSSMRA85T10A562S`.
- **Superadmin**: vede "Gestione" nell'intestazione.

I dati di esempio hanno **prezzi finti**. I test (`test:e2e`, `test:db`) cancellano profili, prenotazioni e blocchi degli utenti di prova all'inizio e alla fine: dopo averli lanciati il profilo va ricreato.

### Verificare che tutto funzioni

Prima di ogni pull request, nell'ordine: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:db`, `npm run test:e2e`. Le prime cinque girano anche su GitHub; le ultime due solo sul computer, perché usano il progetto Supabase.

`test:e2e` comprende i controlli di accessibilità (`e2e/a11y.spec.ts`) e di uso da tastiera e su schermo stretto (`e2e/keyboard.spec.ts`).

### Cambiare il database

Ogni modifica è un nuovo file in `supabase/migrations/`; quelli già applicati non si toccano. `npm run db:push` lo applica al progetto, `npm run db:types` aggiorna i tipi del codice.

### Amministratori (superadmin)

Più persone possono avere il ruolo, con gli stessi permessi.

- **Aggiungere**: la persona accede una volta all'app con il suo numero; poi `npm run admin:superadmin -- <numero> --confirm <rif>` (numero con il prefisso, es. `393331234567`). Esce e rientra: da lì vede "Gestione".
- **Togliere**: `npm run admin:revoke -- <numero> --confirm <rif>`. I salvataggi sono bloccati subito; le pagine di Gestione restano visibili fino al rinnovo dell'accesso (circa un'ora).
- **Cambio di numero**: si aggiunge il nuovo e si toglie il vecchio.

In produzione gli stessi comandi si lanciano con le chiavi del progetto di produzione, tenute in un file separato da `.env.local` (vedi la lista di controllo prima del lancio nel piano).

### Cosa fare se…

| Problema                                                             | Cosa fare                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La pagina mostra un errore all'avvio                                 | Controlla che `.env.local` esista e sia completo (confronta con `.env.example`), poi rilancia `npm run dev`.                                                                                   |
| "Hai chiesto troppi codici"                                          | Supabase limita i codici per numero: aspetta un minuto e riprova.                                                                                                                              |
| "Il codice non è corretto o è scaduto"                               | In sviluppo usa il codice fisso del numero di prova. In produzione chiedi un nuovo codice.                                                                                                     |
| Il calendario non mostra orari prenotabili                           | In Gestione → Riepilogo controlla orario e sport attivi: uno sport senza prezzo in un orario non è prenotabile lì, e il riepilogo lo segnala. Controlla anche i blocchi in Gestione → Blocchi. |
| Non vedo "Gestione"                                                  | Il numero non ha il ruolo, oppure non hai rifatto l'accesso dopo averlo ricevuto: esci e rientra.                                                                                              |
| Una prenotazione viene rifiutata                                     | Il messaggio dice il motivo: orario appena preso da altri, struttura bloccata, oltre le due settimane, orario già iniziato.                                                                    |
| Una persona ha sbagliato il profilo                                  | Il profilo non si modifica dall'app: la persona scrive all'indirizzo di supporto e la correzione si fa sul database.                                                                           |
| Il CSV non si apre bene in Excel                                     | Il file usa il punto e virgola e la codifica UTF-8: aprilo con doppio clic o da Excel con Dati → Da testo/CSV.                                                                                 |
| "Lo storico è cambiato dopo il download"                             | Scarica di nuovo il CSV e ripeti l'eliminazione: il server elimina solo le prenotazioni del CSV più recente.                                                                                   |
| I test end-to-end falliscono con "troppi codici" o per tempo scaduto | Aspetta un minuto e rilancia; se un test fallisce sempre nello stesso punto, è un problema da correggere.                                                                                      |

## Comandi

| Comando                                   | Cosa fa                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`                             | Server di sviluppo                                                                    |
| `npm run build`                           | Build di produzione                                                                   |
| `npm run lint`                            | ESLint                                                                                |
| `npm run format` / `npm run format:check` | Formatta / verifica la formattazione con Prettier                                     |
| `npm run typecheck`                       | Genera i tipi delle route e verifica TypeScript                                       |
| `npm test`                                | Test unitari con Vitest, senza rete; girano anche su GitHub                           |
| `npm run test:watch`                      | Test unitari in modalità watch                                                        |
| `npm run test:e2e`                        | Test end-to-end con Playwright su viewport da smartphone; solo in locale              |
| `npm run test:db`                         | Test di vincoli e regole di accesso sul progetto Supabase di sviluppo; solo in locale |

A ogni pull request GitHub Actions esegue lint, formattazione, typecheck e test unitari.

## Database (Supabase)

Il database vive nel progetto Supabase; la sua struttura è descritta dai file in `supabase/migrations/`, versionati in git. Docker non serve: tutti i comandi lavorano sul progetto remoto. La prima volta: `npx supabase login` (da un terminale normale, apre il browser) e `npx supabase link --project-ref <riferimento>`.

| Comando                                                | Cosa fa                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:push`                                      | Applica al progetto le migrazioni nuove                                                                                         |
| `npm run db:types`                                     | Rigenera `src/types/database.ts` dallo schema del progetto                                                                      |
| `npm run db:seed -- --confirm <rif>`                   | Carica i dati di esempio: orario 9–23, 3 sport, **prezzi finti**                                                                |
| `npm run admin:superadmin -- [numero] --confirm <rif>` | Dà il ruolo superadmin a un utente (senza numero: `TEST_PHONE_SUPERADMIN`); vale dal suo accesso successivo                     |
| `npm run admin:revoke -- <numero> --confirm <rif>`     | Toglie il ruolo superadmin: salvataggi bloccati subito, pagine di Gestione visibili fino al rinnovo dell'accesso (circa un'ora) |
| `npm run db:reset-test -- --confirm <rif>`             | Cancella prenotazioni, profili e blocchi dei soli utenti di prova                                                               |

`<rif>` è il riferimento del progetto, la parte iniziale dell'URL (`https://<rif>.supabase.co`): gli script che modificano dati lo chiedono per evitare di agire sul progetto sbagliato.

**Regole di accesso, in breve**: gli utenti possono solo leggere, e solo i propri dati; il superadmin legge tutto. Ogni scrittura passa dal server con la chiave secret, dopo i controlli. Il calendario vede gli slot occupati come orari; chi ha fatto l'accesso vede anche nome del prenotante e sport. Per cambiare lo schema si aggiunge una nuova migrazione, mai si modifica una già applicata.

## Struttura

```
src/app/          pagine e layout (Next.js App Router): /, /accedi, /profilo, /prenota, /prenotazioni, /admin/**
src/components/ui componenti di interfaccia di base
src/domain/       regole di dominio pure (slot, prezzi, codice fiscale, età)
src/lib/supabase/ client Supabase (server, browser, servizio solo server)
src/server/db/    conversioni tra database e dominio
src/server/admin/ letture, CSV e messaggi dell'area di gestione
src/server/booking/ calendario, formati e messaggi della prenotazione
src/content/      testi versionati (autocertificazione)
src/server/auth.ts  controllo della sessione (Data Access Layer): unico punto che legge l'utente corrente
src/proxy.ts      aggiornamento della sessione a ogni richiesta
supabase/         configurazione e migrazioni del database
scripts/          script operativi (superadmin, dati di esempio, pulizia)
tests/db/         test sul database di sviluppo
e2e/              test end-to-end Playwright
.claude/          PRD, piani e configurazione degli strumenti di sviluppo
DESIGN.md         regole di stile dell'interfaccia
```

## Convenzioni

- **Naming**: file e cartelle in kebab-case, componenti React in PascalCase. Codice e dominio in inglese; testi dell'interfaccia in italiano.
- **Errori**: gli errori di dominio sono tipizzati e le server actions li restituiscono come risultato (`{ ok: false, error }`), non come eccezioni. Le eccezioni restano per i guasti imprevisti.
- **Test**: unitari accanto al modulo (`modulo.test.ts`), end-to-end in `e2e/`. La logica si scrive test-first.
- **Stile**: l'interfaccia segue solo [`DESIGN.md`](DESIGN.md). Le richieste di modifica al frontend puro si annotano tra le "Modifiche rinviate" di `DESIGN.md`.
- **Next.js 16**: alcune API differiscono dalle versioni precedenti; prima di scrivere codice consultare la guida inclusa in `node_modules/next/dist/docs/` (vedi [`AGENTS.md`](AGENTS.md)).

## Crediti

- Stemma del Comune di Merlara: [Merlara-Stemma.svg](https://commons.wikimedia.org/wiki/File:Merlara-Stemma.svg), Wikimedia Commons, licenza [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Versione ottimizzata con SVGO in `public/brand/merlara-coat-of-arms.svg`, distribuita con la stessa licenza. Lo stemma è un'insegna ufficiale: il suo uso richiede l'autorizzazione del Comune.
- Logo NEOS APS: proprietà dell'associazione.
