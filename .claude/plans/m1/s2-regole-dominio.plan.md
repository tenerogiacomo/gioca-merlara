# Sotto-piano S2 — Regole di dominio

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s2-regole-dominio`
**Richiede Task 0**: No
**Revisione di sicurezza**: No
**Look and feel**: nessuna interfaccia
**Complessità**: Media

## Obiettivo
Scrivere in TypeScript puro, senza database né interfaccia, le regole che decidono **quali slot esistono, quanto costano, se sono prenotabili** e **se un profilo è valido** (codice fiscale e maggiore età). Sono le regole più delicate del servizio: stanno in un solo posto, sono coperte da test e verranno usate da S3 (schema del database), S4 (profilo), S5 (configurazione) e S6 (prenotazione).

## Decisioni (approvate il 10 novembre 2026)
| # | Decisione |
|---|---|
| D1 | **Date e fusi orari con `temporal-polyfill`** (1.0.8), implementazione di Temporal. Si toglie quando Node lo includerà nativamente. |
| D2 | **Orario di apertura**: modello con uno o più intervalli per giorno, allineati alla durata dello slot. **Al lancio orario continuato 9–23 tutti i giorni** (da confermare con l'amministrazione). Limiti e divieti in giorni particolari (es. eventi) sono blocchi gestiti dal superadmin (S7). |
| D3 | **Prezzi per sport**: chi prenota indica lo sport e il prezzo dello slot dipende da **sport, giorno della settimana e fascia oraria** (prezzo dello slot intero, non a persona). Regole di prezzo `{ sport, weekdays, from, to, priceCents }`, zero compreso; per lo stesso sport non possono sovrapporsi. **Uno sport senza regola per quello slot non è prenotabile in quello slot.** La disponibilità della struttura non dipende dallo sport: chi prenota occupa la struttura intera. Indicazioni iniziali: fascia gratuita feriale per i ragazzi (indicativamente 15–17), sabato e domenica a pagamento; importi da definire (fuori ambito). |
| D4 | **Orizzonte**: da oggi a oggi + 13 giorni (due settimane, ora di Roma). |
| D5 | **Uno slot è prenotabile fino al suo inizio.** La prenotazione "al volo" di uno slot libero già iniziato è da valutare dopo il lancio. |
| D6 | **Cambio dell'ora**: slot definiti dall'ora d'inizio locale; a marzo l'ora inesistente si salta, a ottobre l'ora ripetuta vale una volta. |
| D7 | **Codice fiscale**: formato, carattere di controllo, omocodia, coerenza con data di nascita e con nome e cognome. |
| D8 | **Maggiore età** sulla data di oggi a Roma; nati il 29 febbraio maggiorenni il 1° marzo negli anni non bisestili. |

## Specifiche
- **Configurazione** in `src/domain/config.ts`: durata dello slot 60 minuti, orizzonte 14 giorni, fuso `Europe/Rome`. Costanti: cambiarle richiede un rilascio.
- **Tipi di dominio** in `src/domain/types.ts`, fonte di verità per lo schema del database di S3:
  - orario settimanale: per ogni giorno, elenco di intervalli `{ opens, closes }` in ora locale `HH:MM`;
  - sport: `{ id, name }`, elenco configurato dal superadmin in S5;
  - regola di prezzo: `{ sportId, weekdays, from, to, priceCents }`;
  - blocco: `{ startsAt, endsAt }` come istanti, copre sia singole fasce sia periodi interi;
  - slot: `{ startsAt, endsAt, localDate, localTime, status, prices }` con stato `available | booked | blocked | past | unpriced` e `prices` = prezzo per ogni sport prenotabile in quello slot.
- **Calcolo degli slot**: funzione pura che riceve orario, sport, regole di prezzo, blocchi, slot già occupati e "adesso", e restituisce gli slot dell'orizzonte con stato e prezzi per sport. Lo stato segue questo ordine di priorità: passato, bloccato, occupato, senza prezzo (nessuno sport prenotabile), disponibile.
- **Verifica di una richiesta di prenotazione**: dati l'inizio richiesto e lo sport, restituisce slot e prezzo oppure un errore tipizzato (`not_aligned`, `outside_opening_hours`, `beyond_horizon`, `past`, `blocked`, `booked`, `unknown_sport`, `unpriced`). La userà la server action di S6, così il server ricontrolla sempre la richiesta.
- **Validazione della configurazione** (usata da S5): intervalli allineati alla durata dello slot, apertura prima della chiusura, nessuna sovrapposizione; regole di prezzo dello stesso sport senza sovrapposizioni; per ogni sport, elenco degli orari aperti scoperti.
- **Codice fiscale e maggiore età**: funzioni che restituiscono un risultato `{ ok: true } | { ok: false, error }` con errori tipizzati (`format`, `check_character`, `birth_date_mismatch`, `name_mismatch`, `underage`), da cui S4 ricava i messaggi in italiano.
- **Prezzi**: formattazione in euro con `Intl` (es. "5,00 €", "Gratis" per lo zero).

## Sottotask

### 2.1 Branch e stato del piano
- **Azione**: creare `m1/s2-regole-dominio`; nel piano padre segnare S1 come `complete` e S2 come `in-progress` con il link a questo sotto-piano.
- **Verifica**: `git status` pulito dopo il commit.

### 2.2 Libreria per le date
- **Azione**: installare la libreria scelta in D1 a versione esatta; modulo `src/domain/time.ts` con le poche funzioni di conversione usate dal dominio (da istante a data e ora di Roma e viceversa).
- **Verifica**: test sulle conversioni nei giorni del cambio d'ora.

### 2.3 Configurazione e tipi
- **Azione**: `config.ts` e `types.ts` come da specifiche.
- **Verifica**: `npm run typecheck`.

### 2.4 Validazione di orario e fasce (test-first)
- **Azione**: test e poi implementazione della validazione della configurazione.
- **Verifica**: test su intervalli disallineati, sovrapposti, invertiti; regole sovrapposte per lo stesso sport (ammesse tra sport diversi); orari scoperti per sport.

### 2.5 Calcolo degli slot (test-first)
- **Azione**: test e poi implementazione del calcolo degli slot.
- **Verifica**: test su:
  - apertura e chiusura, più intervalli nello stesso giorno, giorni chiusi;
  - blocchi su una fascia e su un periodo di più giorni, anche a cavallo di uno slot;
  - slot occupati, slot passati, slot in corso;
  - limite dell'orizzonte;
  - prezzi diversi per sport nello stesso slot, fascia gratuita, sport senza regola in uno slot;
  - ultima domenica di marzo e ultima domenica di ottobre, con struttura aperta di giorno e di notte.

### 2.6 Verifica di una richiesta di prenotazione (test-first)
- **Azione**: test e poi implementazione, riusando il calcolo degli slot.
- **Verifica**: un test per ogni errore tipizzato e per il caso valido, con prezzo dello sport scelto.

### 2.7 Codice fiscale (test-first)
- **Azione**: test e poi implementazione: normalizzazione (maiuscole, spazi), formato, omocodia, carattere di controllo, data di nascita, nome e cognome (accenti, apostrofi, doppi nomi, cognomi corti).
- **Verifica**: test con codici validi, codici con un carattere sbagliato, codici omocodici, date di uomini e donne, nomi con meno di tre consonanti.

### 2.8 Maggiore età (test-first)
- **Azione**: test e poi implementazione.
- **Verifica**: test con 17 anni e 364 giorni, 18 anni esatti, nati il 29 febbraio.

### 2.9 Prezzi
- **Azione**: formattazione dei prezzi in euro.
- **Verifica**: test su zero, centesimi, importi interi.

### 2.10 Revisione e pull request
- **Azione**: `/code-review`; pull request con `gh`; merge dopo l'ok del committente; stato di S2 aggiornato nel piano padre.
- **Verifica**: CI verde.

## File coinvolti
| File | Azione |
|---|---|
| `package.json`, `package-lock.json` | UPDATE (libreria per le date) |
| `src/domain/config.ts`, `src/domain/types.ts`, `src/domain/time.ts` | CREATE |
| `src/domain/schedule.ts` e test | CREATE |
| `src/domain/slots.ts` e test | CREATE |
| `src/domain/booking-request.ts` e test | CREATE |
| `src/domain/codice-fiscale.ts` e test | CREATE |
| `src/domain/age.ts` e test | CREATE |
| `src/domain/money.ts` e test | CREATE |
| `.claude/plans/prenotazione-regolamentata.plan.md` | UPDATE (stati) |

## Criteri di uscita
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build` passano in locale e su GitHub
- [ ] Ogni funzione pubblica di `src/domain/` ha test, inclusi i giorni del cambio d'ora e i casi limite dell'età
- [ ] Nessuna dipendenza da database, rete o interfaccia in `src/domain/`
- [ ] I tipi di dominio sono documentati come fonte di verità per S3

## Rischi
| Rischio | Mitigazione |
|---|---|
| Errori sul cambio d'ora | Test dedicati sui due giorni dell'anno, con aperture diurne e notturne |
| Le tariffe reali (fascia gratuita, sport) cambiano il modello | Il modello generico sport + giorni + orario copre le indicazioni attuali; i valori si configurano in S5 senza toccare il dominio |
| Codici fiscali reali rifiutati per un controllo troppo severo su nome e cognome | Test con casi limite noti; se il committente preferisce, D7 si riduce al solo controllo di formato, carattere e data |
| La configurazione di S5 richiede regole non previste | Le regole stanno in un solo modulo, facile da estendere |

## Rollback
Revert della pull request: lo step non tocca servizi esterni.
