# Sotto-piano S8 — Rifinitura e consegna della milestone 1

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s8-rifinitura-consegna`
**Richiede Task 0**: Sì (completato)
**Revisione di sicurezza**: No (nessun nuovo accesso ai dati)
**Look and feel**: verifica l'aderenza a `DESIGN.md`; nessuna scelta di stile nuova
**Complessità**: Media

## Obiettivo
Chiudere la milestone 1. Ogni schermata segue `DESIGN.md` ed è accessibile da smartphone e da tastiera. Il README spiega in linguaggio semplice come avviare, verificare e gestire il servizio. I criteri di accettazione sono verificati uno per uno.

## Decisioni (approvate il 12 novembre 2026)
| # | Decisione proposta |
|---|---|
| D1 | **S8 non realizza le "Modifiche rinviate"** (nuovo design di accesso e pagina iniziale, chip). Le verifica soltanto rispetto al `DESIGN.md` attuale. A fine S8 il committente rivede tutte le schermate in locale e detta il design definitivo; Claude lo scrive in `DESIGN.md`, e uno step dedicato (S9, "Design definitivo") lo realizza prima di chiudere la milestone 1. |
| D2 | **Accessibilità automatica**: `@axe-core/playwright` su accesso, codice, profilo, completamento del profilo, calendario, conferma della prenotazione, le mie prenotazioni e tutte le pagine di Gestione (riepilogo, orario, sport, prezzi, blocchi, prenotazioni). Obiettivo: zero violazioni gravi o critiche. **Un contrasto insufficiente non viene corretto**: viene segnalato al committente con i colori coinvolti. Le altre violazioni (etichette, ruoli, struttura) si correggono senza cambiare lo stile. |
| D3 | **Tastiera e smartphone**: test end-to-end che fa il percorso di prenotazione solo con la tastiera (Tab, Invio, Spazio) e controlla che il focus sia sempre visibile; passata su viewport stretta (360 px) per verificare che nessuna pagina scorra in orizzontale. |
| D4 | **Runbook nel README**, per chi non conosce il backend: avvio in locale; dati e numeri di prova; comandi di verifica; migrazioni; amministratori (aggiungere, togliere, cambiare numero); cosa fare se qualcosa non funziona (accesso, codice SMS, calendario vuoto, prenotazione rifiutata, CSV). |
| D5 | **Messa online fuori dalla milestone 1**: hosting, progetto Supabase di produzione e provider SMS restano nella lista di controllo prima del lancio, come oggi. |
| D6 | **Icona del sito**: arriva con il design definitivo in S9. |
| D7 | **Chiusura**: criteri di accettazione del piano padre verificati uno per uno; PRD aggiornato (milestone 1 completata, salvo il design definitivo di S9); domande aperte (fascia gratuita per i ragazzi, limite di prenotazioni per persona) riportate nel PRD. |

## Sottotask

### 8.1 Branch e stati
- **Azione**: branch da `main`; S7 `complete` e S8 `in-progress` nel piano padre.

### 8.2 Controllo automatico di accessibilità
- **Azione**: dipendenza `@axe-core/playwright`; `e2e/a11y.spec.ts` con le pagine di D2, da visitatore, utente con profilo e superadmin.
- **Verifica**: zero violazioni gravi o critiche, salvo i contrasti segnalati al committente.

### 8.3 Tastiera e viewport stretta
- **Azione**: test di D3; correzioni di etichette, ordine del focus e larghezze che escono dallo schermo.

### 8.4 Aderenza a `DESIGN.md`
- **Azione**: confronto di ogni schermata con colori, tipografia, spaziature, pulsanti, campi, messaggi e tono dei testi di `DESIGN.md`; correzione degli scostamenti; elenco di ciò che `DESIGN.md` non copre, da chiedere al committente.

### 8.5 Runbook
- **Azione**: sezioni del README di D4, in linguaggio semplice.

### 8.6 Chiusura
- **Azione**: verifica dei criteri di accettazione; aggiornamento di PRD e piano padre (D7); stabilità dei test end-to-end con tre esecuzioni complete di fila.

### 8.7 Revisione e pull request
- **Azione**: `/code-review`; pull request; merge del committente.

## File coinvolti
| File | Azione |
|---|---|
| `package.json` | UPDATE (`@axe-core/playwright`) |
| `e2e/a11y.spec.ts`, `e2e/keyboard.spec.ts` | CREATE |
| Componenti e pagine con scostamenti | UPDATE |
| `README.md` | UPDATE |
| `.claude/prds/gioca-merlara.prd.md`, piano padre | UPDATE |

## Criteri di uscita
- [ ] Zero violazioni axe gravi o critiche sulle pagine elencate (contrasti eventualmente segnalati al committente)
- [ ] Percorso di prenotazione completo da tastiera; nessuno scorrimento orizzontale a 360 px
- [ ] Runbook nel README
- [ ] Criteri di accettazione verificati; PRD e piano aggiornati
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build`, `test:db`, `test:e2e` passano (end-to-end tre volte di fila)

## Rischi
| Rischio | Mitigazione |
|---|---|
| Contrasti della palette insufficienti | Segnalati al committente con i valori; nessun cambio di colore di iniziativa |
| Test end-to-end instabili | Tre esecuzioni complete di fila; i test instabili si correggono, non si ripetono in automatico |

## Rollback
Revert della pull request: nessuna modifica al database.
