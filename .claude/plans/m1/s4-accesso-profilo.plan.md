# Sotto-piano S4 — Accesso e profilo

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s4-accesso-profilo` (da `main`, dopo il merge di S3)
**Richiede Task 0**: Sì (completato)
**Revisione di sicurezza**: Sì
**Look and feel**: segue `DESIGN.md`
**Complessità**: Alta

## Obiettivo
Le prime schermate per l'utente-tipo: una pagina iniziale che presenta la struttura, l'accesso con numero di telefono e codice SMS, il completamento obbligatorio del profilo e la sua consultazione. Senza profilo completo e maggiorenne non si va oltre.

## Decisioni (approvate il 10 novembre 2026)
| # | Decisione |
|---|---|
| D1 | **Loghi** (scelta delegata a Claude, scritta in `DESIGN.md` §12): logo NEOS nell'intestazione di ogni pagina; stemma del Comune nel piè di pagina con la dicitura "In collaborazione con il Comune di Merlara". |
| D2 | **Codice fiscale obbligatorio** al lancio: chi non ce l'ha (es. visitatori stranieri) non può registrarsi. |
| D3 | **Profilo in sola lettura** dopo il salvataggio. Per correggerlo si scrive al superadmin via email: la pagina del profilo mostra l'indirizzo con un link `mailto:` precompilato. |
| D4 | **Pagina iniziale**: breve presentazione della struttura con il pulsante "Accedi". Il committente prevede a breve un nuovo design di accesso e pagina iniziale: queste schermate restano isolate in pochi componenti, così il restyling non tocca la logica. |
| D5 | **Numeri di telefono**: si accettano numeri italiani con o senza `+39` e numeri esteri con il prefisso internazionale; il server li normalizza prima di inviare il codice. |
| D6 | **Controlli sempre lato server**: ogni pagina riservata e ogni server action verifica la sessione con `getClaims()` (Data Access Layer); il proxy aggiorna solo la sessione. |

## Specifiche

### Pagine
| Percorso | Chi | Contenuto |
|---|---|---|
| `/` | tutti | Presentazione breve della struttura (testo in bozza, da approvare) e "Accedi"; con l'accesso fatto, collegamento al profilo |
| `/accedi` | senza sessione | Numero di telefono → invio del codice |
| `/accedi/codice` | senza sessione | Codice a 6 cifre, "Invia un nuovo codice" dopo l'attesa, "Cambia numero" |
| `/profilo/completa` | con sessione, senza profilo | Nome, cognome, data di nascita, codice fiscale |
| `/profilo` | con profilo | Dati in sola lettura, contatto per le correzioni, "Esci" |

Instradamento: chi non ha sessione e apre una pagina riservata va su `/accedi`; chi ha sessione ma non ha profilo va su `/profilo/completa`; chi ha già il profilo e apre `/profilo/completa` va su `/profilo`.

### Server actions
- **Invio del codice**: normalizza il numero (D5), chiede il codice a Supabase Auth, porta alla pagina del codice.
- **Verifica del codice**: verifica con Supabase Auth, che imposta i cookie di sessione; porta al profilo da completare o alla destinazione richiesta.
- **Salvataggio del profilo**: verifica la sessione, valida con Zod e con le regole di S2 (codice fiscale coerente con nome, cognome e data; maggiore età), salva con il client di servizio. Un codice fiscale già registrato produce un messaggio dedicato.
- **Uscita**: chiude la sessione.

### Messaggi d'errore (in italiano, dicono cosa fare)
| Caso | Messaggio, in sostanza |
|---|---|
| Numero non valido | Controlla il numero, con il prefisso se è estero |
| Troppi codici richiesti | Aspetta qualche secondo prima di chiederne un altro |
| Codice errato o scaduto | Controlla il codice o chiedine uno nuovo |
| `format` / `check_character` | Il codice fiscale non è valido: controlla di averlo copiato tutto |
| `birth_date_mismatch` | Il codice fiscale non corrisponde alla data di nascita |
| `name_mismatch` | Il codice fiscale non corrisponde a nome e cognome |
| `underage` | Al momento la prenotazione è riservata ai maggiorenni |
| `invalid_birth_date` | La data di nascita non è valida |
| Codice fiscale già registrato | Esiste già un profilo con questo codice fiscale: scrivi al superadmin |

### Struttura comune
- Intestazione con il logo NEOS, piè di pagina con lo stemma e la dicitura (D1).
- Con Cache Components, le parti che leggono la sessione stanno dentro confini `<Suspense>`; il resto della pagina resta statico.

## Domande aperte
- ~~Indirizzo email per le correzioni~~: `neosaps@proton.me`, nella variabile di configurazione `NEXT_PUBLIC_SUPPORT_EMAIL`.
- **Testo della pagina iniziale**: Claude scrive una bozza breve in tono "di comunità", da approvare o sostituire.

## Sottotask

### 4.1 Branch, stati e `DESIGN.md`
- **Azione**: branch da `main`; S3 `complete` e S4 `in-progress` nel piano padre; in `DESIGN.md` §12 la regola dei loghi (D1) e, tra le "Modifiche rinviate", il nuovo design di accesso e pagina iniziale.
- **Verifica**: `git status` pulito.

### 4.2 Guide di riferimento
- **Azione**: leggere nella documentazione inclusa in Next.js 16 le guide su autenticazione (Data Access Layer), server actions e form, Cache Components e `<Suspense>`.
- **Verifica**: annotazioni sulle API da usare nel sotto-piano.

### 4.3 Numeri di telefono (test-first)
- **Azione**: funzione pura di normalizzazione e validazione (D5) in `src/domain/phone.ts`.
- **Verifica**: test con numeri italiani con e senza prefisso, spazi e trattini, numeri esteri, numeri troppo corti o con lettere.

### 4.4 Data Access Layer
- **Azione**: `src/server/auth.ts` con lettura dell'utente corrente da `getClaims()`, del suo profilo, e funzioni che reindirizzano (`requireUser`, `requireProfile`).
- **Verifica**: test end-to-end dell'instradamento (4.10).

### 4.5 Accesso con OTP
- **Azione**: pagine `/accedi` e `/accedi/codice`, server actions di invio e verifica, attesa prima del nuovo invio, messaggi d'errore.
- **Verifica**: test end-to-end con i numeri di prova.

### 4.6 Completamento del profilo
- **Azione**: pagina `/profilo/completa`, server action di salvataggio con le regole di S2 e i messaggi della tabella.
- **Verifica**: test unitari della traduzione errori → messaggi; test end-to-end di rifiuto e salvataggio.

### 4.7 Profilo in sola lettura e uscita
- **Azione**: pagina `/profilo` con i dati, il contatto per le correzioni e "Esci".
- **Verifica**: test end-to-end.

### 4.8 Pagina iniziale
- **Azione**: presentazione breve e "Accedi", isolata in un componente sostituibile (D4); testo in bozza sottoposto al committente.
- **Verifica**: test end-to-end con e senza sessione.

### 4.9 Intestazione e piè di pagina
- **Azione**: layout comune con i loghi (D1), seguendo `DESIGN.md`.
- **Verifica**: test di accessibilità (testo alternativo dei loghi).

### 4.10 Test end-to-end
- **Azione**: Playwright su viewport da smartphone con i numeri di prova, pulizia dei dati all'inizio, esecuzione in sequenza per rispettare l'attesa tra un codice e l'altro.
- **Verifica**: `npm run test:e2e` passa su esecuzioni ripetute.

### 4.11 Revisione e pull request
- **Azione**: agente `security-reviewer` sulle server actions e sul Data Access Layer; `/code-review`; pull request; merge dopo l'ok del committente.
- **Verifica**: nessun problema critico o grave aperto; CI verde.

## File coinvolti
| File | Azione |
|---|---|
| `src/domain/phone.ts` e test | CREATE |
| `src/server/auth.ts` | CREATE |
| `src/server/profile-messages.ts` e test | CREATE |
| `src/app/page.tsx`, `src/app/layout.tsx` | UPDATE |
| `src/app/accedi/**`, `src/app/profilo/**` | CREATE |
| `src/components/site-header.tsx`, `site-footer.tsx`, `landing-intro.tsx` | CREATE |
| `e2e/*.spec.ts`, `playwright.config.ts` | CREATE / UPDATE |
| `DESIGN.md`, `.env.example`, `README.md` | UPDATE |

## Criteri di uscita
- [ ] Accesso, completamento e consultazione del profilo funzionano su smartphone con i numeri di prova
- [ ] Un minorenne o un codice fiscale non valido vengono rifiutati con il messaggio previsto
- [ ] Nessuna pagina riservata è raggiungibile senza sessione, e nessuna oltre il profilo senza profilo
- [ ] Le schermate seguono `DESIGN.md`
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build`, `test:db`, `test:e2e` passano
- [ ] Revisione di sicurezza senza problemi critici o gravi aperti

## Rischi
| Rischio | Mitigazione |
|---|---|
| L'attesa tra un codice e l'altro rende i test end-to-end instabili | Test in sequenza, un accesso per utente per esecuzione |
| Cache Components e sessione: errori di build se la sessione è letta fuori da `<Suspense>` | Guida dedicata letta nel 4.2; letture della sessione solo nel Data Access Layer |
| Il nuovo design di accesso cambia tutto | Schermate isolate in pochi componenti; logica nelle server actions |
| Persone reali senza codice fiscale escluse | Decisione D2 del committente, da rivedere dopo il lancio |

## Rollback
Revert della pull request: lo step non cambia lo schema del database.
