# Sotto-piano S6 — Prenotazione e annullo dell'utente

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s6-prenotazione`
**Richiede Task 0**: Sì (completato)
**Revisione di sicurezza**: Sì
**Look and feel**: segue `DESIGN.md` (schermate dell'utente-tipo, prioritarie)
**Complessità**: Alta

## Obiettivo
Il cuore del servizio: una persona con profilo completo vede il calendario della struttura, sceglie giorno, orario e sport, accetta l'autocertificazione e prenota. Poi ritrova le sue prenotazioni e può annullarle. Il server ricontrolla sempre la richiesta con le regole di S2; il database garantisce l'esclusiva dello slot.

## Decisioni (approvate l'11 novembre 2026)
| # | Decisione proposta |
|---|---|
| D1 | **Calendario visibile a tutti**, anche senza accesso, ma solo come "libero" / "occupato". Chi ha il profilo vede anche nome e sport di chi ha prenotato (S3). Per prenotare servono accesso e profilo completo. |
| D2 | **Percorso**: giorno → slot libero d'inizio → sport (solo quelli con un prezzo in quello slot) → **durata** → autocertificazione → "Prenota". **Una prenotazione può coprire più slot consecutivi** (2, 3 o più ore), senza un limite di durata se non l'orario di apertura e gli slot liberi; **il costo è la somma dei prezzi degli slot** per lo sport scelto. Una prenotazione non può unire slot gratuiti e a pagamento: le fasce gratuite si prenotano a sé. |
| D3 | **Annullo dell'utente sempre possibile fino all'inizio dello slot**, anche a ridosso (raccomandazione di cortesia: 24 ore prima). Dopo l'inizio non si annulla più. Nessun voucher nella milestone 1: arriva con la milestone 2. |
| D4 | **Autocertificazione v1 in bozza**, scritta da Claude a partire dal PRD (danni alla struttura, infortuni, impegno a richiudere a fine slot): va validata dai legali prima del lancio. Si accetta a ogni prenotazione; versione e momento restano nella prenotazione. |
| D5 | **Prezzo mostrato, nessun pagamento** nella milestone 1: la prenotazione è confermata subito. Il pagamento arriva con la milestone 2. |
| D6 | **"Le mie prenotazioni"**: prima le prossime, poi le ultime 10 passate o annullate. |
| D7 | **Navigazione**: link "Prenota" nell'intestazione per tutti e "Le mie prenotazioni" per chi ha fatto l'accesso; la pagina iniziale porta al calendario. |

## Specifiche

### Pagine
| Percorso | Contenuto |
|---|---|
| `/prenota` | Giorni dell'orizzonte (oggi + 13) come scelta orizzontale; per il giorno scelto, gli slot con stato e prezzi per sport |
| `/prenota/[inizio]` | Riepilogo dello slot, scelta dello sport con prezzo, testo dell'autocertificazione, casella "Ho letto e accetto", "Prenota" |
| `/prenotazioni` | Le mie prenotazioni: prossime con "Annulla", poi passate e annullate |

Stati degli slot nel calendario: Libero (con i prezzi), Occupato (con nome e sport per chi ha il profilo), Chiuso per un blocco, Passato, Non prenotabile (nessun prezzo). Il giorno scelto e lo slot scelto usano l'accento rosa, come previsto da `DESIGN.md`.

### Server actions
- **Prenota**: verifica sessione e profilo; ricarica configurazione, blocchi e periodi occupati; verifica inizio, durata e sport con `checkBookingRequest` (S2, esteso a più slot); inserisce con il client di servizio una sola prenotazione con inizio, fine, prezzo totale, sport e autocertificazione. Se lo slot viene preso nel frattempo, il vincolo del database lo impedisce e l'utente vede un messaggio chiaro con il calendario aggiornato.
- **Annulla**: verifica che la prenotazione sia dell'utente, attiva e non ancora iniziata; la segna come annullata dall'utente.

### Messaggi (dal dominio di S2)
| Errore | Messaggio, in sostanza |
|---|---|
| `booked` | Qualcuno ha appena prenotato questo orario: scegline un altro |
| `blocked` | In questo orario la struttura non è disponibile |
| `past` | Questo orario è già iniziato |
| `beyond_horizon` | Si prenota al massimo due settimane prima |
| `outside_opening_hours` / `not_aligned` | Orario non valido: scegline uno dal calendario |
| `unknown_sport` / `unpriced` | Questo sport non è prenotabile in questo orario |
| autocertificazione non accettata | Per prenotare devi accettare l'autocertificazione |

## Sottotask

### 6.1 Branch e stati
- **Azione**: branch da `main`; S5 `complete` e S6 `in-progress` nel piano padre.

### 6.1b Prenotazioni di più ore (conseguenza di D2)
- **Database**: l'esclusiva diventa un vincolo di non sovrapposizione degli intervalli di tempo delle prenotazioni attive (al posto dell'unicità sull'inizio); `occupied_slots` restituisce anche la fine della prenotazione.
- **Dominio (S2)**: gli slot occupati diventano periodi occupati; `checkBookingRequest` accetta una durata e verifica che tutti gli slot siano consecutivi, liberi, con prezzo per lo sport e tutti gratuiti o tutti a pagamento (errore `mixed_free_paid`); prezzo totale come somma; funzione che elenca le durate possibili da uno slot d'inizio per uno sport.
- **Verifica**: test unitari del dominio; `npm run test:db` con il nuovo vincolo (sovrapposizione parziale rifiutata).

### 6.2 Autocertificazione v1
- **Azione**: `content/autocertificazione-v1.md` in bozza (D4) e modulo che espone testo e versione.
- **Verifica**: test unitario sulla versione.

### 6.3 Caricamento del calendario
- **Azione**: lettura di configurazione, blocchi (`blocked_periods`) e slot occupati (`occupied_slots`) per l'orizzonte; calcolo con `computeSlots` (S2); conversione per l'interfaccia.
- **Verifica**: test unitari della conversione; test end-to-end con dati di prova.

### 6.4 Calendario `/prenota`
- **Azione**: scelta del giorno e lista degli slot, con nomi e sport solo per chi ha il profilo.
- **Verifica**: test end-to-end senza accesso e con accesso.

### 6.5 Prenotazione `/prenota/[inizio]` (test-first per i messaggi)
- **Azione**: pagina di riepilogo, scelta dello sport, autocertificazione e server action di prenotazione.
- **Verifica**: test end-to-end: prenotazione riuscita, autocertificazione non accettata, slot non più disponibile.

### 6.6 Prenotazioni simultanee
- **Azione**: test con gli utenti A e B che prenotano lo stesso slot nello stesso momento.
- **Verifica**: una sola prenotazione riesce; l'altra persona vede il messaggio.

### 6.7 Le mie prenotazioni e annullo
- **Azione**: pagina `/prenotazioni` e server action di annullo (D3).
- **Verifica**: test end-to-end: annullo e slot di nuovo libero; nessun annullo di prenotazioni altrui o già iniziate.

### 6.8 Navigazione
- **Azione**: link nell'intestazione e dalla pagina iniziale (D7).

### 6.9 Revisione e pull request
- **Azione**: agente `security-reviewer`; `/code-review`; pull request; merge del committente.
- **Verifica**: nessun problema critico o grave aperto; CI verde.

## File coinvolti
| File | Azione |
|---|---|
| `content/autocertificazione-v1.md`, `src/server/booking/autocert.ts` | CREATE |
| `src/server/booking/calendar.ts`, `booking-messages.ts` e test | CREATE |
| `src/app/prenota/**`, `src/app/prenotazioni/**` | CREATE |
| `src/components/site-header.tsx`, `src/components/landing-intro.tsx` | UPDATE |
| `e2e/booking.spec.ts` | CREATE |

## Criteri di uscita
- [ ] Una persona con profilo prenota da smartphone e ritrova la prenotazione; può annullarla prima dell'inizio
- [ ] Due prenotazioni simultanee dello stesso slot: una sola riesce
- [ ] Senza accesso il calendario mostra solo libero / occupato
- [ ] Ogni prenotazione salvata ha sport, prezzo e autocertificazione accettata
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build`, `test:db`, `test:e2e` passano; i test non lasciano prenotazioni
- [ ] Revisione di sicurezza senza problemi critici o gravi aperti

## Rischi
| Rischio | Mitigazione |
|---|---|
| Testo dell'autocertificazione non validato | Versione in bozza dichiarata; sostituibile senza toccare il codice (D4) |
| Calendario lento su smartphone | Un giorno alla volta; dati dell'orizzonte caricati in una sola richiesta per tipo |
| Fuso orario sbagliato nelle date mostrate | Tutto in Europe/Rome con le funzioni di S2; test sui giorni del cambio d'ora già presenti |
| Domanda aperta sulla fascia gratuita "per i ragazzi" | Al lancio la prenota un maggiorenne come ogni altra fascia; la regola si adegua quando il committente decide |

## Rollback
Revert della pull request: lo step non cambia lo schema del database.
