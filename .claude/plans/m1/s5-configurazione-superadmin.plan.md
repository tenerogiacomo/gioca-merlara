# Sotto-piano S5 — Configurazione superadmin: orario, sport e prezzi

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s5-configurazione-superadmin`
**Richiede Task 0**: Sì (completato)
**Revisione di sicurezza**: Sì
**Look and feel**: segue `DESIGN.md` (area superadmin: priorità alla chiarezza)
**Complessità**: Alta

## Obiettivo
Un'area riservata al superadmin, usabile da smartphone, per configurare l'orario settimanale di apertura, l'elenco degli sport e i prezzi per sport e fascia oraria. Sono i dati che il calendario di S6 mostrerà agli utenti. I valori finti caricati in sviluppo vengono sostituiti da quelli reali, inseriti dal committente da qui.

## Decisioni (approvate il 10 novembre 2026)
| # | Decisione proposta |
|---|---|
| D1 | **Area `/admin` solo per il ruolo superadmin.** Per chiunque altro la pagina non esiste (errore 404), così l'area non si rivela. Al superadmin non serve un profilo utente. Nell'intestazione compare il collegamento "Gestione" solo per lui. |
| D2 | **Salvataggi tutto-o-niente.** L'orario della settimana e le regole di prezzo di uno sport si salvano come un blocco unico, tramite due piccole funzioni SQL eseguibili solo dal server. Così un errore a metà non lascia mai la struttura senza orario o uno sport senza prezzi. |
| D3 | **Sport** (il committente conferma: uno slot libero è libero per qualsiasi sport; chi prenota occupa la struttura intera): si creano, si rinominano, si riordinano, si attivano e si disattivano. **Non si cancellano**, perché le prenotazioni passate li citano. L'identificativo nasce dal nome alla creazione (es. "Beach volley" → `beach-volley`) e poi non cambia. |
| D4 | **Prezzi per sport** come elenco di fasce: giorni della settimana, dalle, alle, prezzo in euro (zero = gratis). Al salvataggio si rifiutano le fasce sovrapposte. Gli orari aperti senza prezzo sono mostrati come **avviso, non errore**: in quegli orari quello sport non sarà prenotabile. **Una fascia è gratuita o a pagamento per tutti gli sport**: non possono esistere, nello stesso giorno e orario, una fascia gratuita per uno sport e una a pagamento per un altro (richiesta del committente, confermata l'11 novembre 2026). Le fasce gratuite si prenotano a sé, slot per slot come tutte le altre. |
| D5 | **Le modifiche non toccano le prenotazioni esistenti.** Il prezzo è già salvato nella prenotazione. Se il nuovo orario esclude prenotazioni future già fatte, il salvataggio le elenca come avviso senza annullarle: gli annulli d'ufficio arrivano in S7. |
| D6 | **Orari a granularità oraria**: dalle 00:00 alle 24:00, a passi di 60 minuti, come gli slot. |
| D7 | **Nessun registro delle modifiche** nella milestone 1. Il superadmin è uno solo; un registro si può aggiungere dopo. |

## Specifiche

### Pagine
| Percorso | Contenuto |
|---|---|
| `/admin` | Riepilogo: orario della settimana, sport attivi, avvisi sugli orari senza prezzo; collegamenti alle tre sezioni |
| `/admin/orario` | Per ogni giorno: chiuso oppure uno o più intervalli; "Aggiungi intervallo", "Rimuovi", "Copia su tutti i giorni" |
| `/admin/sport` | Elenco con ordine, stato attivo/disattivo, rinomina; "Aggiungi sport" |
| `/admin/prezzi/[sport]` | Fasce di prezzo dello sport; avviso degli orari scoperti; "Aggiungi fascia", "Rimuovi" |

### Server actions (tutte verificano il ruolo superadmin)
- **Salva orario**: valida con `validateSchedule` (S2), sostituisce l'orario in un'unica operazione, restituisce le eventuali prenotazioni future fuori orario (D5).
- **Crea / modifica sport**: nome obbligatorio e unico; ordine; attivo sì o no.
- **Salva prezzi di uno sport**: converte gli euro in centesimi, valida con `validatePriceRules` (S2), sostituisce le fasce dello sport in un'unica operazione, restituisce gli orari scoperti (`findUncoveredSlots`).

### Database
Migrazione con due funzioni, eseguibili solo con la chiave secret:
- `replace_opening_intervals(intervalli)`;
- `replace_price_rules(sport, fasce)`.

Ognuna cancella e reinserisce in una sola transazione; i vincoli delle tabelle restano la seconda difesa.

### Parti pure (test-first)
- Conversione dei prezzi: "12,50" / "12.5" / "12" → 1250 centesimi; "gratis" o "0" → 0; rifiuto di valori negativi, con più di due decimali o non numerici.
- Identificativo dello sport dal nome: minuscole, senza accenti, trattini.
- Lettura dei form dell'orario e delle fasce in tipi di dominio, con messaggi d'errore in italiano.

## Sottotask

### 5.1 Branch e stati
- **Azione**: branch da `main`; S4 `complete` e S5 `in-progress` nel piano padre.
- **Verifica**: `git status` pulito.

### 5.2 Controllo del ruolo
- **Azione**: `requireSuperadmin()` nel Data Access Layer (404 per tutti gli altri); collegamento "Gestione" nell'intestazione solo per il superadmin.
- **Verifica**: test end-to-end con utente normale e superadmin.

### 5.3 Funzioni di sostituzione atomica
- **Azione**: migrazione con le due funzioni (D2), permessi solo a `service_role`; tipi rigenerati.
- **Verifica**: `npm run test:db` con test nuovi: un input non valido non cambia nulla; `anon` e `authenticated` non possono eseguirle.

### 5.4 Parti pure
- **Azione**: prezzi, identificativi, lettura dei form (test-first).
- **Verifica**: test unitari.

### 5.5 Orario
- **Azione**: pagina e server action di `/admin/orario`, con l'avviso delle prenotazioni fuori orario.
- **Verifica**: test end-to-end: modifica, intervallo sovrapposto rifiutato, ricaricando la pagina la modifica resta.

### 5.6 Sport
- **Azione**: pagina e server actions di `/admin/sport`.
- **Verifica**: test end-to-end: creazione, rinomina, disattivazione; nome duplicato rifiutato.

### 5.7 Prezzi
- **Azione**: pagina e server action di `/admin/prezzi/[sport]`, con l'avviso degli orari scoperti.
- **Verifica**: test end-to-end: fascia gratuita, fasce sovrapposte rifiutate, avviso degli orari scoperti.

### 5.8 Riepilogo
- **Azione**: pagina `/admin`.
- **Verifica**: test end-to-end.

### 5.9 Test end-to-end senza lasciare tracce
- **Azione**: i test fotografano orario, sport e prezzi all'inizio e li ripristinano alla fine, così non toccano la configurazione reale inserita dal committente.
- **Verifica**: configurazione identica prima e dopo `npm run test:e2e`.

### 5.10 Revisione e pull request
- **Azione**: agente `security-reviewer` (server actions, funzioni SQL, controllo del ruolo); `/code-review`; pull request; merge del committente.
- **Verifica**: nessun problema critico o grave aperto; CI verde.

## File coinvolti
| File | Azione |
|---|---|
| `supabase/migrations/*_sostituzioni_configurazione.sql` | CREATE |
| `src/types/database.ts` | UPDATE (generato) |
| `src/server/auth.ts` | UPDATE (`requireSuperadmin`) |
| `src/domain/money.ts`, `src/domain/sport-id.ts` e test | UPDATE / CREATE |
| `src/server/admin/*.ts` e test | CREATE (lettura dei form, caricamento della configurazione) |
| `src/app/admin/**` | CREATE |
| `src/components/site-header.tsx` | UPDATE |
| `e2e/admin.spec.ts`, `e2e/global-setup.ts`, `e2e/global-teardown.ts` | CREATE / UPDATE |
| `tests/db/*.test.ts` | UPDATE |

## Criteri di uscita
- [ ] Il superadmin configura da smartphone orario, sport e prezzi, e le modifiche restano dopo il ricaricamento
- [ ] Gli altri utenti, con o senza accesso, ricevono 404 su ogni pagina `/admin`
- [ ] Nessun salvataggio lascia la configurazione a metà
- [ ] Gli orari senza prezzo e le prenotazioni fuori orario sono segnalati
- [ ] `npm run lint`, `format:check`, `typecheck`, `npm test`, `build`, `test:db`, `test:e2e` passano; i test non alterano la configurazione
- [ ] Revisione di sicurezza senza problemi critici o gravi aperti

## Rischi
| Rischio | Mitigazione |
|---|---|
| I test modificano la configurazione reale | Fotografia e ripristino nel 5.9 |
| Una modifica dell'orario lascia prenotazioni fuori orario | Avviso con l'elenco (D5); annullo d'ufficio in S7 |
| Server action invocata da chi non è superadmin | Ogni action ricontrolla il ruolo; test dedicati |
| Moduli complessi da usare su smartphone | Un giorno o una fascia per riga, pulsanti grandi; avvisi in linguaggio semplice |

## Rollback
Revert della pull request; la migrazione aggiunge solo funzioni, rimovibili con una migrazione correttiva.
