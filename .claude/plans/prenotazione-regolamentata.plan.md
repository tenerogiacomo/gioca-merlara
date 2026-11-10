# Plan: Prenotazione regolamentata

**Source PRD**: `.claude/prds/gioca-merlara.prd.md`
**Selected Milestone**: 1 — Prenotazione regolamentata
**Complexity**: Large

## Summary
Prima tappa di costruzione interna, senza dati reali: una web app ottimizzata per smartphone dove una persona maggiorenne crea il profilo con verifica del telefono via OTP, vede le disponibilità, prenota uno slot in esclusiva e accetta l'autocertificazione. Il superadmin configura orario di default e prezzi per fascia, blocca fasce o periodi e annulla d'ufficio. Pagamenti, voucher e PIN dei lucchetti sono esclusi e arrivano con le milestone 2 e 3.

## Stack (consolidato il 4 novembre 2026)
Principio guida, deciso dal committente: **esternalizzare l'autenticazione e ridurre al minimo la logica e le integrazioni di backend da gestire.**

| Ambito | Scelta | Versione verificata | Perché |
|---|---|---|---|
| Linguaggio | TypeScript | 6.0.3 | La 7.x non è ancora supportata da typescript-eslint (8.72 accetta `<6.1`) |
| Framework | Next.js (App Router) con React | 16.4.5 / 19.3.1 | Il committente conosce React; pagine e server actions in un solo progetto |
| Database | PostgreSQL su Supabase, progetto cloud di sviluppo in regione UE | — | Docker non è installato: niente database locale |
| Autenticazione | Supabase Auth con OTP via SMS | — | Esternalizzata: sessioni, codici, scadenze e tentativi li gestisce Supabase |
| Client | `@supabase/supabase-js` e `@supabase/ssr` | 2.118.0 / 0.12.7 | Sessione nei cookie; letture con la sessione dell'utente, scritture dalle server actions |
| Schema e migrazioni | Supabase CLI: migrazioni SQL versionate e tipi TypeScript generati | 3.0.0 | Uno strumento in meno rispetto a un ORM separato |
| Sicurezza dei dati | Row Level Security di PostgreSQL con regole semplici, solo in lettura per gli utenti | — | Ogni persona vede solo i propri dati; nessuno scrive direttamente nel database |
| Invio SMS | Provider configurato nel pannello Supabase; in sviluppo numeri di prova con OTP fisso | — | Il provider resta una domanda aperta e non richiede codice |
| Validazione | Zod | 4.6.7 | Stessi schemi per form e server actions |
| Stile | Tailwind CSS, mobile-first; regole visive scritte con il committente in `DESIGN.md` (S1) | 4.3.4 | Rapidità e coerenza su smartphone |
| Test | Vitest per la logica di dominio, Playwright end-to-end su viewport mobile | 5.1.0 / 1.64.1 | Test-first come da `tdd-workflow` |
| Gestore pacchetti | npm | 11.19.0 (Node 24.21) | Già installato |
| Produzione | Da decidere al lancio; Supabase Auth porta di fatto verso Supabase anche in produzione | — | Scelta rinviata dal committente |

**Divisione delle responsabilità:**
- **Supabase**: utenti, sessioni, OTP, database, vincoli di integrità, regole di accesso ai dati.
- **Codice TypeScript**: regole di dominio (slot, disponibilità, codice fiscale, età) come funzioni pure testate con Vitest; server actions sottili che verificano la sessione, applicano le regole e scrivono.
- **Scritture solo dal server**: gli utenti non hanno permesso di scrittura diretta su profili e prenotazioni. La chiave pubblica di Supabase è visibile nel browser, quindi senza questo vincolo chiunque abbia una sessione potrebbe aggirare le regole di dominio scrivendo direttamente nel database. Le server actions scrivono con la chiave di servizio, che resta solo sul server.
- **Niente funzioni SQL complesse**: il database garantisce solo l'esclusiva e la visibilità dei dati.
- **Ruolo superadmin**: salvato in `app_metadata`, che l'utente non può modificare. Mai in `user_metadata`, che l'utente può cambiare da solo.

## Patterns to Mirror
Repository greenfield: contiene solo `README.md`, `LICENSE`, `.gitignore` ed `.env.example`, nessun codice. Non ci sono pattern da imitare; le convenzioni nascono con questa milestone e vanno fissate nello step S1.

| Category | Source | Pattern |
|---|---|---|
| Naming | — | Da definire: file in kebab-case, componenti in PascalCase, dominio in inglese, testi UI in italiano |
| Errors | — | Da definire: errori di dominio tipizzati, restituiti dalle server actions come risultato e non come eccezione |
| Tests | — | Da definire: test accanto al modulo (`*.test.ts`), end-to-end in `e2e/` |

## Regole di dominio (dal PRD)
- **Fuso orario**: tutti gli slot sono in Europe/Rome, salvati in UTC. Il cambio dell'ora legale non deve creare slot doppi o mancanti.
- **Slot**: 60 minuti, orizzonte di 14 giorni. Nella milestone 1 sono costanti di configurazione nel codice: cambiarle richiede un rilascio. Cambiare la durata con prenotazioni future già presenti non è supportato.
- **Esclusiva**: uno slot ha al massimo una prenotazione attiva, garantito dal database e non solo dal codice.
- **Disponibilità**: uno slot è prenotabile se rientra nell'orario di apertura, non è bloccato, non è passato, è dentro l'orizzonte e non è già prenotato.
- **Prezzo**: per sport, giorno e fascia oraria, zero compreso; chi prenota indica lo sport. In questa milestone viene solo mostrato; nessun incasso.
- **Profilo**: nome, cognome, data di nascita, codice fiscale e telefono verificato. Solo maggiorenni. Codice fiscale validato nel formato e nel carattere di controllo.
- **Autocertificazione**: accettata a ogni prenotazione; versione del testo e momento dell'accettazione si salvano nella riga stessa della prenotazione, così non può esistere una prenotazione senza accettazione.
- **Nessun limite** di prenotazioni per utente.
- **Privacy delle disponibilità**: chi consulta il calendario vede solo se uno slot è libero, mai chi lo ha prenotato.

## Files to Change
| File | Action | Why |
|---|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc` | CREATE | Scaffolding del progetto |
| `.env.example`, `.gitignore` | UPDATE | Variabili d'ambiente documentate (URL, chiave pubblica, chiave di servizio solo server), segreti esclusi da git |
| `.github/workflows/ci.yml` | CREATE | Lint, typecheck e test unitari a ogni pull request |
| `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql` | CREATE | Collegamento al progetto, migrazioni SQL (profili, orari, prezzi, blocchi, prenotazioni, regole di accesso) e dati iniziali di sviluppo |
| `scripts/` | CREATE | Assegnazione del superadmin e pulizia dei dati di test, con la chiave di servizio |
| `src/types/database.ts` | CREATE | Tipi generati dallo schema Supabase |
| `src/lib/supabase/`, `src/proxy.ts` | CREATE | Client Supabase per server, browser e servizio; aggiornamento della sessione nel proxy di Next.js 16 (ex middleware) |
| `src/domain/types.ts` | CREATE | Tipi di dominio (orario, fasce di prezzo, blocchi, slot): definiti in S2, lo schema del database in S3 si adegua |
| `src/domain/slots.ts` | CREATE | Generazione degli slot e calcolo delle disponibilità |
| `src/domain/codice-fiscale.ts` | CREATE | Validazione del codice fiscale e coerenza con la data di nascita |
| `src/domain/booking.ts` | CREATE | Regole di prenotazione, annullo dell'utente, annullo d'ufficio |
| `src/app/(public)/` | CREATE | Accesso, profilo, calendario, prenotazione, le mie prenotazioni |
| `src/app/admin/` | CREATE | Orario di default, prezzi, blocchi, elenco e annullo prenotazioni |
| `content/autocertificazione-v1.md` | CREATE | Testo versionato dell'autocertificazione (bozza, in attesa dei legali) |
| `tests/db/` | CREATE | Test di vincoli e regole di accesso sul progetto Supabase di sviluppo |
| `e2e/` | CREATE | Percorsi completi su viewport mobile |
| `README.md` | UPDATE | Istruzioni di avvio, test e struttura |

## Step
I 10 task originali sono riorganizzati in 8 step, ognuno grande quanto una pull request. Ogni step avrà un proprio sotto-piano in `.claude/plans/m1/`, scritto e approvato dal committente **uno alla volta**, prima di scrivere il codice di quello step. Il Task 0 resta a carico del committente.

Questa suddivisione ha passato una revisione indipendente (4 novembre 2026). Le correzioni principali riguardano la sicurezza: scritture solo dal server e ruolo superadmin in `app_metadata`.

### Ordine e dipendenze
```
S1 Fondamenta → S2 Regole di dominio → S3 Database e accessi → S4 Accesso e profilo
   → S5 Configurazione superadmin → S6 Prenotazione → S7 Blocchi e annulli d'ufficio → S8 Rifinitura e consegna
                                  ↑
                     Task 0 (committente) serve da S3 in poi
```
- S1 e S2 non richiedono il Task 0: il lavoro parte prima che il progetto Supabase esista.
- S2 viene prima di S3 perché definisce i tipi di dominio a cui lo schema del database si adegua.
- La configurazione di orari e prezzi (S5) viene prima della prenotazione (S6), così il calendario ha dati reali da mostrare.

| Step | Contenuto | Richiede Task 0 | Revisione di sicurezza | Look and feel | Sotto-piano | Stato |
|---|---|---|---|---|---|---|
| S1 | Fondamenta del progetto e `DESIGN.md` | No | No | Scrive `DESIGN.md` con il committente | `m1/s1-fondamenta.plan.md` | complete |
| S2 | Regole di dominio | No | No | — | `m1/s2-regole-dominio.plan.md` | in-progress |
| S3 | Database e regole di accesso | Sì | Sì | — | — | pending |
| S4 | Accesso e profilo | Sì | Sì | Segue `DESIGN.md` | — | pending |
| S5 | Configurazione superadmin: orario, sport e prezzi | Sì | Sì | Segue `DESIGN.md` | — | pending |
| S6 | Prenotazione e annullo dell'utente | Sì | Sì | Segue `DESIGN.md` | — | pending |
| S7 | Blocchi, elenco prenotazioni e annulli d'ufficio | Sì | Sì | Segue `DESIGN.md` | — | pending |
| S8 | Rifinitura e consegna | Sì | No | Verifica l'aderenza a `DESIGN.md` | — | pending |

### Look and feel: `DESIGN.md` (richiesta del committente)
Le scelte di stile dell'interfaccia sono del committente, soprattutto per le schermate dell'utente-tipo (residente o visitatore da smartphone).
- **In S1** il committente dà a voce le indicazioni di stile; Claude le scrive in `DESIGN.md` (palette, tipografia, spaziature, componenti, tono dei testi) e il committente le approva. `DESIGN.md` diventa il tema Tailwind e i componenti base.
- **Negli step successivi** l'interfaccia segue solo `DESIGN.md`. Nessuna anteprima e nessun mockup.
- **Se `DESIGN.md` non copre un caso**, Claude lo spiega a voce e chiede al committente prima di decidere; la risposta viene aggiunta a `DESIGN.md`.
- **Nessuna scelta di stile nuova** viene introdotta da Claude di propria iniziativa (colori, font, componenti, animazioni).
- **Modifiche al frontend puro** chieste durante i lavori vengono annotate nella sezione "Modifiche rinviate" di `DESIGN.md` e realizzate a fine progetto.

### Task 0: Preparazione del progetto Supabase (committente, prima di S3)
- **Action**: Il committente crea l'account Supabase ed esegue il login della CLI (passaggio interattivo). Da lì Claude crea il progetto gratuito in regione UE, abilita l'accesso via telefono e scrive `.env.local`, che resta fuori da git. I passaggi possibili solo dal pannello vengono guidati uno per uno.
- **Output richiesti**: almeno 3 numeri di prova con OTP fisso (utente A, utente B, superadmin); URL, chiave pubblica e chiave di servizio del progetto.
- **Validate**: l'accesso con un numero di prova restituisce una sessione.

### S1 — Fondamenta del progetto
- **Specifica**: Progetto Next.js 16 in TypeScript 6 con ESLint, Prettier, Tailwind, Vitest e Playwright; pagina iniziale segnaposto mobile-first. Stesura di `DESIGN.md` dalle indicazioni verbali del committente; da lì il tema Tailwind e i componenti base (pulsanti, campi, messaggi). Integrazione continua su GitHub con lint, typecheck e `npm test`. Script separati: `npm test` contiene solo test senza rete; `test:db` e `test:e2e` girano in locale perché richiedono il progetto Supabase. Convenzioni di naming, errori e test nel README. Completa `.gitignore` ed `.env.example` già presenti. Mette sotto git PRD e piani.
- **Uscita**: `npm run lint`, `npm run typecheck` e `npm test` passano in locale e su GitHub; un test Playwright apre la pagina segnaposto su viewport mobile; `DESIGN.md` approvato dal committente e tradotto nel tema Tailwind e nei componenti base.

### S2 — Regole di dominio
- **Specifica**: Tipi di dominio (orario settimanale, fasce di prezzo, blocchi, slot) e funzioni pure, senza database. Generazione degli slot e calcolo delle disponibilità: Europe/Rome, durata e orizzonte da costanti di configurazione, blocchi, prezzi, slot passati. Validazione del codice fiscale (formato, carattere di controllo, omocodia, coerenza con la data di nascita) e controllo della maggiore età.
- **Uscita**: test unitari verdi in `npm test`, inclusi i giorni del cambio d'ora di marzo e ottobre e le persone di 17 e 18 anni.

### S3 — Database e regole di accesso
- **Specifica**: Collegamento della Supabase CLI al progetto, verificando quali comandi funzionano senza Docker (i test pgTAP di `supabase test db` lo richiedono, quindi si usa Vitest). Migrazioni per profili, orario settimanale, fasce di prezzo, blocchi e prenotazioni, con colonne per versione e momento dell'autocertificazione; schema conforme ai tipi di S2. Vincolo di unicità parziale sull'inizio dello slot per le prenotazioni attive. Row Level Security su ogni tabella: gli utenti leggono solo i propri dati e non scrivono direttamente; il superadmin, riconosciuto da `app_metadata`, legge tutto. Vista degli slot occupati che espone solo l'inizio dello slot. Dati iniziali di sviluppo (orario e fasce di prezzo di esempio). Client Supabase per server, browser e servizio; aggiornamento della sessione in `proxy.ts`. Script per assegnare il superadmin e per ripulire i dati di test. Tipi TypeScript generati.
- **Uscita** (`npm run test:db`):
  - una seconda prenotazione attiva sullo stesso slot viene rifiutata; una annullata non blocca la successiva;
  - un inserimento diretto in prenotazioni o profili con la sessione dell'utente viene rifiutato;
  - un utente non legge profili e prenotazioni di un altro; chi non ha sessione non legge la tabella delle prenotazioni;
  - la vista degli slot occupati non contiene dati personali;
  - un utente non può darsi il ruolo superadmin modificando i propri metadati;
  - il superadmin assegnato dallo script legge tutto.

### S4 — Accesso e profilo
- **Specifica**: Accesso con numero di telefono e OTP tramite Supabase Auth, sessione nei cookie, pagine riservate protette. Completamento obbligatorio del profilo con le validazioni di S2, salvato da server action: senza profilo completo e maggiorenne non si prenota. Ogni errore di dominio (`format`, `check_character`, `birth_date_mismatch`, `name_mismatch`, `underage`, `invalid_birth_date`) ha un messaggio in italiano che dice cosa fare.
- **Uscita** (`npm run test:e2e`, con pulizia dei dati di test a inizio esecuzione): accesso riuscito, codice errato rifiutato, pagine protette inaccessibili senza sessione, profilo rifiutato per minorenne o codice fiscale non valido, profilo valido salvato.

### S5 — Configurazione superadmin: orario, sport e prezzi
- **Specifica**: Area riservata al ruolo superadmin. Configurazione dell'orario settimanale di apertura, dell'elenco degli sport e dei prezzi per sport e fascia, zero compreso; segnalazione degli orari scoperti per ogni sport.
- **Uscita**: test end-to-end: un utente normale non apre l'area; il superadmin modifica orario e prezzi e la modifica è visibile ricaricando la pagina.

### S6 — Prenotazione e annullo dell'utente
- **Specifica**: Calendario per giorno con stato degli slot e prezzi per sport; chi prenota sceglie lo sport, calcolati con le funzioni di S2 sui dati configurati in S5. Prenotazione da server action, che verifica disponibilità e profilo e salva l'accettazione dell'autocertificazione versionata nella stessa riga. Messaggio chiaro se lo slot viene preso nel frattempo. Elenco delle proprie prenotazioni e annullo sempre consentito (il voucher arriva con la milestone 2).
- **Uscita**: con gli utenti A e B, due prenotazioni simultanee dello stesso slot: una sola riesce. Test end-to-end: dall'accesso alla prenotazione confermata, poi annullo e slot di nuovo libero.

### S7 — Blocchi, elenco prenotazioni e annulli d'ufficio
- **Specifica**: Nell'area superadmin: blocchi di fasce e di periodi, elenco di tutte le prenotazioni, annullo d'ufficio. Un blocco su uno slot già prenotato chiede conferma e annulla la prenotazione.
- **Uscita**: test end-to-end: dopo un blocco lo slot non è più prenotabile ricaricando il calendario; un blocco su uno slot prenotato annulla la prenotazione dopo conferma; un utente normale non vede l'elenco.

### S8 — Rifinitura e consegna
- **Specifica**: Verifica che tutte le schermate seguano `DESIGN.md`. Passata su viewport mobile e accessibilità (contrasti, etichette, tastiera); un contrasto insufficiente viene segnalato al committente invece di cambiare i colori di propria iniziativa, con controllo automatico `@axe-core/playwright` sulle pagine di accesso, profilo, calendario, le mie prenotazioni e area superadmin. Runbook nel README in linguaggio semplice: avvio, test, migrazioni, assegnazione del superadmin, cosa fare se qualcosa non funziona. Verifica finale dei criteri di accettazione e aggiornamento della milestone 1 nel PRD.
- **Uscita**: zero violazioni gravi o critiche di axe sulle pagine elencate; tutti i criteri della sezione Acceptance verificati.

### Flusso di lavoro di ogni step
1. Claude scrive il sotto-piano dello step con specifiche e sottotask; il committente lo approva o lo corregge.
2. Branch dedicato `m1/sN-nome` da `main`.
3. Sviluppo test-first (skill `tdd-workflow`).
4. `/code-review`, più l'agente `security-reviewer` negli step segnati.
5. Pull request con `gh`; merge in `main` dopo l'ok del committente.
6. Aggiornamento dello stato in questa tabella.

### Invarianti, verificati alla fine di ogni step
- `npm run lint`, `npm run typecheck` e `npm test` passano, anche su GitHub.
- Da S3 in poi passano anche `npm run test:db` e, dove presenti, `npm run test:e2e`.
- Nessun segreto in git; la chiave di servizio non viene mai importata da codice che arriva al browser.
- Da S3 in poi: ogni tabella ha la Row Level Security attiva, gli utenti non scrivono direttamente e nessun dato personale è leggibile da chi non ne è il titolare o il superadmin.

### Rollback
- Codice: revert della pull request dello step.
- Database: migrazione correttiva successiva; i dati di sviluppo sono di prova e il database può essere ricreato.

## Validation
```bash
npm run lint
npm run typecheck
npm test
npm run db:push
npm run test:db
npm run test:e2e
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Errori sugli slot nei giorni del cambio d'ora | Media | Test dedicati sui giorni di marzo e ottobre; calcoli sempre in Europe/Rome con conversione esplicita |
| Doppia prenotazione dello stesso slot | Media | Vincolo di unicità nel database e test di concorrenza |
| Regole di accesso ai dati scritte male espongono dati personali | Media | Test espliciti per ogni regola; il calendario legge solo la vista senza dati personali |
| Alcuni comandi della Supabase CLI richiedono Docker | Media | Da verificare in S3; in alternativa migrazioni applicate dall'editor SQL del pannello, sempre versionate in git |
| L'accesso via telefono richiede un provider SMS configurato anche per i numeri di prova | Media | Da verificare nel Task 0; se serve, account di prova del provider |
| Il piano gratuito mette in pausa il progetto dopo un periodo di inattività | Alta | Accettabile in sviluppo; da considerare nella scelta della produzione |
| I test end-to-end condividono il database di sviluppo | Media | Script di pulizia eseguito a inizio test; dati di test riconoscibili; eventuale secondo progetto dedicato ai test |
| I test che usano Supabase non girano su GitHub | Alta | Accettato nella milestone 1: girano in locale prima di ogni pull request; segreti su GitHub da valutare al lancio |
| Le decisioni ancora aperte cambiano il profilo (visitatori senza codice fiscale, minorenni) | Alta | Validazioni del profilo isolate in un solo modulo, facili da modificare |
| Dati personali raccolti prima di avere titolare del trattamento e informativa | Media | Milestone 1 solo interna, con dati di prova; nessun dato reale prima della decisione del direttivo |
| Testo dell'autocertificazione non ancora validato dai legali | Alta | Testo versionato: la versione approvata sostituisce la bozza senza modifiche al codice |
| Backend e deploy sono gestiti interamente da Claude: il committente non può rivederli | Alta | Revisione di sicurezza automatica a ogni step che tocca dati o accessi; runbook operativo nel README, comprensibile anche a chi non conosce il backend |

## Acceptance
- [ ] Step S1–S8 completati
- [ ] Validation passes
- [ ] Patterns mirrored, not reinvented
- [ ] Il percorso completo, dall'accesso alla prenotazione confermata, funziona su smartphone
- [ ] Ogni schermata segue `DESIGN.md`; le modifiche di stile chieste nel frattempo sono annotate tra le modifiche rinviate
- [ ] Il superadmin configura orario, prezzi e blocchi e annulla d'ufficio
