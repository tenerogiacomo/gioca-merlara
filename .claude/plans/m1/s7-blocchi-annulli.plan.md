# Sotto-piano S7 — Blocchi, elenco prenotazioni e annulli d'ufficio

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s7-blocchi-annulli`
**Richiede Task 0**: Sì (completato)
**Revisione di sicurezza**: Sì
**Look and feel**: segue `DESIGN.md` (area superadmin; nella pagina "Le mie prenotazioni" cambia solo il testo dello stato)
**Decisioni**: approvate l'11 novembre 2026, con D1 a mezz'ore e D5b aggiunta dal committente
**Complessità**: Alta

## Obiettivo
Il superadmin chiude la struttura quando serve (manutenzione, eventi, ferie), vede tutte le prenotazioni e ne annulla d'ufficio. Un blocco su orari già prenotati chiede conferma e annulla quelle prenotazioni. Blocco e annullo avvengono insieme: o tutto o niente. Chi è stato annullato lo vede tra le sue prenotazioni.

## Decisioni
| # | Decisione proposta |
|---|---|
| D1 | **Blocco = un periodo continuo** da giorno e ora d'inizio a giorno e ora di fine, **a mezz'ore** (es. 18:30–20:30), oppure a giornate intere (es. dal 1° al 15 agosto). Uno slot di un'ora toccato anche solo in parte dal blocco risulta chiuso (18:30–20:30 chiude 18–19, 19–20 e 20–21). Motivo facoltativo, visibile solo al superadmin. Nessun limite in avanti: si può bloccare anche oltre le due settimane prenotabili. **Niente blocchi ricorrenti**. La scelta degli orari usa per ora i componenti esistenti; il design si rivede a fine milestone 1 (`DESIGN.md`, Modifiche rinviate). |
| D2 | **Un blocco inizia nel futuro.** Se tocca una prenotazione già iniziata, è rifiutato con un messaggio che indica da che ora si può bloccare. |
| D3 | **Blocco su orari prenotati**: il primo salvataggio mostra l'elenco delle prenotazioni coinvolte (giorno, ore, nome e cognome, sport) e chiede "Blocca e annulla N prenotazioni". Alla conferma, in un'unica operazione del database: le prenotazioni passano ad "annullata dalla gestione" e il blocco viene salvato. Se nel frattempo è cambiato qualcosa (nuova prenotazione nel periodo), si richiede di nuovo la conferma. |
| D4 | **Rimozione di un blocco**: possibile per i blocchi in corso o futuri; gli orari tornano prenotabili. Le prenotazioni annullate restano annullate. |
| D5 | **Elenco delle prenotazioni** `/admin/prenotazioni`: "Prossime" (tutte, anche annullate, raggruppate per giorno) e **"Storico"** con tutte le prenotazioni passate mai salvate, filtrabili per periodo (da giorno a giorno) e a pagine da 50. Per ognuna: ore, sport, prezzo, nome e cognome, numero di telefono, stato, motivo dell'annullo. Il telefono serve per avvisare chi viene annullato. Le prenotazioni fuori dall'orario attuale (avviso di S5) sono segnalate "fuori orario". |
| D5b | **Eliminazione dallo storico**, solo a mano dal superadmin, per periodo: 1) scarica il **CSV riepilogativo** del periodo (stesse colonne dell'elenco, più versione e momento dell'autocertificazione); 2) prima conferma "Elimina N prenotazioni dal … al …"; 3) seconda conferma scrivendo il numero N. Il server elimina **esattamente le prenotazioni contenute nel CSV scaricato**: se nel frattempo il periodo è cambiato, rifiuta e chiede di riscaricarlo. Si eliminano solo prenotazioni concluse o annullate, mai quelle attive non ancora finite. L'eliminazione è definitiva. Nota per la milestone 2: con i pagamenti, i dati contabili vanno conservati per gli obblighi fiscali, quindi la regola andrà rivista. |
| D6 | **Annullo d'ufficio** dall'elenco, con conferma, fino all'inizio della prenotazione (come per l'utente). Motivo facoltativo. |
| D7 | **Chi viene annullato** lo vede in "Le mie prenotazioni" come "Annullata dalla gestione", con il motivo se c'è (per un blocco, il motivo del blocco). **Nessun avviso automatico** nella milestone 1 (niente SMS: hanno un costo; niente email: non le raccogliamo): il superadmin può telefonare. Nessun voucher fino alla milestone 2. |

## Specifiche

### Database (una migrazione)
- `bookings.cancel_reason` (testo facoltativo, massimo 200 caratteri) per il motivo dell'annullo d'ufficio.
- Funzione `create_block` (solo `service_role`): riceve periodo, motivo, autore e l'elenco delle prenotazioni che il superadmin ha confermato. Nella stessa transazione rilegge le prenotazioni attive sovrapposte; se non coincidono con quelle confermate non salva nulla e le restituisce; altrimenti le annulla d'ufficio con il motivo e inserisce il blocco. Rifiuta periodi nel passato o che toccano prenotazioni già iniziate.
- Funzione `cancel_booking_by_admin` (solo `service_role`): annulla una prenotazione attiva non ancora iniziata, con motivo.
- Funzione `delete_bookings` (solo `service_role`): riceve il periodo e gli identificativi del CSV scaricato; elimina solo se coincidono con le prenotazioni concluse o annullate del periodo, altrimenti non elimina nulla.
- **Contemporaneità**: un blocco e una prenotazione salvati nello stesso istante non possono passare entrambi. Il controllo dei blocchi sulle prenotazioni (S6) e `create_block` si mettono in fila con un lucchetto della transazione, così uno dei due vede sempre l'altro.

### Pagine
| Percorso | Contenuto |
|---|---|
| `/admin/blocchi` | Modulo del blocco (inizio, fine, "giornata intera", motivo), conferma con le prenotazioni coinvolte, elenco dei blocchi in corso e futuri con "Rimuovi" |
| `/admin/prenotazioni` | Prossime e storico (D5), "Annulla d'ufficio" con conferma e motivo, "Scarica CSV" ed "Elimina" del periodo (D5b) |
| `/admin/prenotazioni/csv` | Route handler del CSV, solo superadmin, con protezione dalle formule nei fogli di calcolo |
| `/admin` | Il riepilogo e il menu della gestione portano anche a blocchi e prenotazioni |
| `/prenotazioni` | Stato "Annullata dalla gestione" con il motivo (D7) |

### Server actions
Tutte chiamano `requireSuperadmin({ fresh: true })`, validano l'input con zod e scrivono solo tramite le funzioni del database.
- **Blocca**: valida il periodo (ore intere, inizio prima della fine, nel futuro); chiama `create_block`; se ci sono prenotazioni coinvolte non confermate, restituisce l'elenco per la conferma.
- **Rimuovi blocco**, **Annulla d'ufficio**, **Elimina dallo storico** (D5b).

## Sottotask

### 7.1 Branch e stati
- **Azione**: branch da `main`; S6 `complete` e S7 `in-progress` nel piano padre.

### 7.2 Database (test-first)
- **Azione**: migrazione con `cancel_reason`, `create_block`, `cancel_booking_by_admin` e lucchetto; tipi rigenerati.
- **Verifica**: `npm run test:db`: blocco senza prenotazioni; blocco con prenotazioni non confermate (niente salvato); conferma (annulla e blocca insieme); conferma scaduta per una nuova prenotazione; prenotazione già iniziata; funzioni non eseguibili da utenti e anonimi; un blocco e una prenotazione in contemporanea non passano entrambi.

### 7.3 Dominio dei blocchi e CSV
- **Azione**: validazione del periodo del blocco a mezz'ore, slot toccati da un blocco, messaggi e formattazione del CSV (funzioni pure con test unitari).

### 7.4 Pagina dei blocchi
- **Azione**: modulo, conferma, elenco e rimozione (D1–D4).
- **Verifica**: end-to-end: dopo un blocco lo slot risulta chiuso ricaricando il calendario e non è prenotabile; un blocco su uno slot prenotato annulla la prenotazione solo dopo la conferma; la rimozione riapre lo slot.

### 7.5 Elenco e annullo d'ufficio
- **Azione**: pagina `/admin/prenotazioni` e annullo (D5, D6).
- **Verifica**: end-to-end: annullo d'ufficio visibile all'utente con il motivo; download del CSV ed eliminazione con doppia conferma; un utente normale riceve 404 su `/admin/prenotazioni`, sul CSV e su `/admin/blocchi`. `test:db`: `delete_bookings` rifiuta elenchi diversi dal periodo e prenotazioni attive.

### 7.6 Le mie prenotazioni
- **Azione**: stato e motivo dell'annullo d'ufficio (D7).

### 7.7 Revisione e pull request
- **Azione**: agente `security-reviewer` e `database-reviewer`; `/code-review`; pull request; merge del committente.
- **Verifica**: nessun problema critico o grave aperto; CI verde.

## File coinvolti
| File | Azione |
|---|---|
| `supabase/migrations/<data>_blocchi_e_annulli.sql`, `src/types/database.ts` | CREATE / UPDATE |
| `tests/db/blocks.test.ts` | CREATE |
| `src/domain/block.ts` e test | CREATE |
| `src/app/admin/blocchi/**`, `src/app/admin/prenotazioni/**` | CREATE |
| `src/app/admin/admin-nav.tsx`, `src/app/admin/page.tsx`, `src/app/prenotazioni/page.tsx` | UPDATE |
| `scripts/lib/admin.ts` (pulizia dei blocchi di prova) | UPDATE |
| `e2e/admin-blocks.spec.ts` | CREATE |

## Criteri di uscita
- [ ] Dopo un blocco lo slot non è più prenotabile, ricaricando il calendario
- [ ] Un blocco su uno slot prenotato annulla la prenotazione solo dopo la conferma
- [ ] Il superadmin vede tutte le prenotazioni e ne annulla d'ufficio; l'utente vede l'annullo e il motivo
- [ ] Lo storico si elimina solo dopo il download del CSV e la doppia conferma, e solo per le prenotazioni del CSV
- [ ] Un utente normale non vede l'elenco né i blocchi
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build`, `test:db`, `test:e2e` passano; i test non lasciano blocchi né prenotazioni
- [ ] Revisione di sicurezza senza problemi critici o gravi aperti

## Rischi
| Rischio | Mitigazione |
|---|---|
| Chi viene annullato non se ne accorge | Telefono nell'elenco del superadmin (D5); avvisi automatici valutabili con la milestone 2 |
| Blocco e prenotazione nello stesso istante | Lucchetto nel database e test dedicato |
| Eliminazione per errore dello storico | CSV obbligatorio prima, doppia conferma, solo prenotazioni concluse o annullate |
| CSV con dati personali | Solo superadmin; niente codice fiscale; il file resta sul dispositivo di chi lo scarica |
| Blocco lungo per errore (es. anno sbagliato) | La conferma riepiloga il periodo; il blocco si rimuove (D4) |
| I test end-to-end lasciano blocchi | Pulizia dei blocchi di prova all'inizio e alla fine, come per le prenotazioni |

## Rollback
Revert della pull request e migrazione inversa (rimozione di funzioni e colonna, ripristino del trigger di S6).
