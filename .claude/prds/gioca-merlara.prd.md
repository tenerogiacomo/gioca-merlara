# Gioca Merlara

## Problema
Residenti e visitatori di Merlara non possono usare la nuova piattaforma polivalente perché manca un servizio per gestire prenotazioni e accesso, e non ci sarà personale in loco. Senza una soluzione la struttura, appena costruita, resta inutilizzata e l'amministrazione non può assolvere all'obbligo di regolamentarne l'uso.

## Evidenze
- L'amministrazione ha l'obbligo di assegnare e gestire le logiche di prenotazione e utilizzo dei nuovi spazi dopo la costruzione (fonte: curatore del progetto).
- È confermato che non ci sarà personale in loco (fonte: curatore del progetto).
- La cittadinanza "scalpita" per usare la struttura. Assunzione: indicazione qualitativa, da validare tramite raccolta delle richieste ricevute o analisi delle prenotazioni dopo il lancio.
- Il modello "prenotazione web + PIN temporizzato su lucchetto smart offline, senza personale" è collaudato all'estero: Tennis Australia/NZ "Book a Court" (ClubSpark + igloohome) e le piattaforme francesi Balle Jaune e OpenResa usano questo schema per campi non custoditi (fonte: ricerca del curatore).

## Utenti
- **Primari**: residenti e visitatori maggiorenni che vogliono usare la struttura. Il bisogno nasce quando cercano un orario libero; prenotano e accedono da soli, in genere da smartphone, con un profilo personale.
- **Secondario**: il superadmin (curatore della piattaforma per NEOS APS): gestisce l'orario di apertura di default e i prezzi per fascia, blocca fasce o periodi, annulla d'ufficio con voucher, riconcilia i pagamenti in contanti.
- **Attori fuori piattaforma**: il gestore dell'esercizio convenzionato (incassa i contanti e annota nome e importo; nessun accesso alla piattaforma) e il reperibile NEOS a rotazione (interviene su guasti e imprevisti; numero pubblicato sul posto e nelle comunicazioni).
- **Non per**: chi cerca abbonamenti o prenotazioni ricorrenti. Minorenni: al lancio prenota solo un maggiorenne; i minorenni accedono sotto la responsabilità del prenotante adulto (codice trasferibile). L'estensione della prenotazione ai minorenni è demandata ai legali.

## Ipotesi
Crediamo che **un servizio web integrato di prenotazione, pagamento e accesso autonomo tramite lucchetti smart a PIN temporizzati** permetterà di **regolamentare e rendere utilizzabile la struttura senza personale in loco** per **residenti e visitatori**.
Sapremo di avere ragione quando **una persona riuscirà a prenotare, assumersi le responsabilità, pagare, accedere e richiudere senza l'intervento di personale**. Non esiste un benchmark: gli obiettivi numerici verranno definiti al termine del primo periodo di osservazione (3 mesi dal lancio).

## Metriche di successo
| Metrica | Obiettivo | Come si misura |
|---|---|---|
| Struttura utilizzabile senza personale in loco | Sì, percorso completo dalla prenotazione alla chiusura dei lucchetti | Verifica del percorso completo prima e dopo il lancio |
| Prenotazioni completate | TBD — numeri definiti al termine del primo periodo di osservazione (3 mesi dal lancio) | Dati delle prenotazioni |
| Accessi che richiedono un intervento manuale | TBD — idem | Registro delle segnalazioni al reperibile |

Nota: il no-show (in particolare sulle fasce gratuite) **non è osservabile al lancio by design** — i lucchetti offline non generano eventi di apertura. Scelta consapevole, da rivalutare dopo il primo periodo.

## Ambito
Il servizio è costruito su misura, non adottato da un SaaS di prenotazione esistente, per tre ragioni: pieno controllo sull'integrazione PIN-lucchetti, pieno controllo sui pagamenti, zero canoni e commissioni di piattaforme terze. NEOS APS copre sviluppo, hardware e costi ricorrenti (indicativi: ~320 € una tantum per i due lucchetti, API ~2 $/lucchetto/mese, commissioni PSP, SMS a consumo, hosting).

**MVP** — Servizio web ottimizzato per smartphone che comprende:
- **Profilo personale obbligatorio**: anagrafica completa (nome, cognome, data di nascita, codice fiscale) + numero di telefono verificato via OTP. Nessun caricamento di documenti: un upload che nessuno verifica non aggiunge garanzie e appesantisce la privacy; un'eventuale identità più forte è demandata ai legali.
- **Prenotazione online con calendario delle disponibilità**: la struttura si prenota sempre in esclusiva; slot da 60 minuti, e una prenotazione può coprire più slot consecutivi senza limite di durata (costo = somma degli slot; gratuiti e a pagamento non si uniscono nella stessa prenotazione) e orizzonte di ~14 giorni (valori di default, da tarare); orario settimanale di apertura di default gestito dal superadmin (al lancio orario continuato 9–23, da confermare con l'amministrazione); chi prenota indica lo **sport** (es. calcetto, tennis, basket), perché il prezzo dello slot dipende dallo sport oltre che da giorno e fascia oraria; prezzi configurabili per sport e fascia, zero compreso (le fasce gratuite sono fasce a prezzo 0, stessa meccanica); indicazioni iniziali del committente: una fascia gratuita per i ragazzi nei giorni feriali (indicativamente 15–17, sempre previa prenotazione), sabato e domenica sempre a pagamento; nessun limite di prenotazioni per utente. Uno slot è prenotabile fino al suo inizio; la prenotazione "al volo" di uno slot libero già iniziato è da valutare dopo il lancio.
- **Autocertificazione di responsabilità** accettata nel flusso da un maggiorenne: danni alla struttura, infortuni, impegno a richiudere i lucchetti a fine slot.
- **Pagamento digitale** come modalità principale, a favore di NEOS APS (PSP da selezionare tra Stripe, Satispay, PayPal). In alternativa **contanti presso l'esercizio convenzionato**: il cliente salda entro il giorno dello slot comunicando il proprio nome; il gestore annota nome e importo; NEOS riconcilia per nome e sospende i profili con slot goduti e mai pagati.
- **Voucher**: l'annullo è sempre possibile e genera sempre un voucher (credito a portafoglio, senza scadenza, spendibile sulle fasce a pagamento), anche a ridosso dello slot; raccomandazione di cortesia: disdire entro 24 ore. Nessun voucher per contanti mai versati (la prenotazione decade). L'annullo d'ufficio del superadmin genera sempre voucher.
- **Accesso autonomo keyless**: due smart padlock igloohome (accesso agli impianti e piattaforma) si aprono con PIN temporizzati generati per ogni prenotazione e mostrati insieme, etichettati; chiusura a scatto senza codice — non esiste riconsegna. Il PIN compare nella pagina della prenotazione ed è inviato via email e SMS dalla mezzanotte del giorno dello slot (subito per le prenotazioni last-minute); la conferma di prenotazione non contiene il PIN. Finestre a granularità oraria: lieve sovrapposizione tra slot adiacenti, benigna. Riserve dichiarate se i due lucchetti risultassero macchinosi: (b) un solo smart padlock + lucchetto a combinazione statica ruotata periodicamente; (c) smart padlock sul portone + box aperto interno per le chiavi.
- **Gestione superadmin**: blocco di fasce orarie o periodi, annulli d'ufficio con voucher, configurazione di orario di default e prezzi per fascia, riconciliazione contanti.
- **Requisito operativo di lancio**: reperibile NEOS a rotazione con numero pubblicato sul posto e nelle comunicazioni; giro periodico di manutenzione dei lucchetti (batterie, risincronizzazione dell'orologio via Bluetooth).

**Fuori ambito**
- App native per smartphone — il sistema è solo web, per facilità di accesso
- Abbonamenti e prenotazioni ricorrenti — non previsti
- Gestione di altre strutture comunali — esclusa
- Tornei ed eventi — esclusi
- Definizione delle tariffe — la piattaforma supporta prezzi per sport e fascia (zero compreso); importi e regole arrivano da NEOS/Comune
- Integrazione con l'esercizio commerciale — il gestore non ha alcun accesso alla piattaforma: incassa e annota il nome
- Keybox e consegna di chiavi — superate dalla scelta keyless
- Rilevazione automatica dei no-show — non osservabile coi lucchetti offline; rivalutare dopo il primo periodo
- Analisi fiscale degli incassi dell'APS — rinviata a progetto completato, per scelta del committente

## Milestone di consegna
<!-- Risultati di business, non attività di sviluppo. /plan trasforma ciascuna in un piano. -->
<!-- Stato: pending | in-progress | complete -->

| # | Milestone | Risultato | Stato | Piano |
|---|---|---|---|---|
| 1 | Prenotazione regolamentata | Le persone creano il profilo (anagrafica + OTP), vedono le disponibilità, prenotano e accettano l'autocertificazione; il superadmin gestisce orario di default, sport, prezzi per sport e fascia, blocchi e annulli | in-progress | `.claude/plans/prenotazione-regolamentata.plan.md` |
| 2 | Pagamento | Le persone pagano online a NEOS APS o in contanti in esercizio (nome + saldo entro il giorno dello slot, riconciliazione per nome); annulli con voucher a portafoglio | pending | — |
| 3 | Accesso autonomo | Le persone aprono i due lucchetti smart coi PIN della prenotazione e richiudono a fine slot, senza personale; sopralluogo, installazione, reperibile e manutenzione attivi | pending | — |

Il lancio pubblico coincide con il completamento della milestone 3: le milestone 1 e 2 sono tappe di costruzione interne.

## Domande aperte
Ogni domanda ha un proprietario. Nessuna scadenza, per scelta del committente; il "primo periodo" di osservazione (3 mesi) parte dal lancio.

- [ ] **Legali**: l'autocertificazione (danni, infortuni, impegno a richiudere) basta a coprire la responsabilità? Serve un'identità più forte del profilo con OTP (documento, SPID/CIE)? Come estendere la prenotazione ai minorenni, incluso l'accesso con codice trasferito da un adulto non presente?
- [ ] **Legali**: l'annullo d'ufficio può essere compensato solo con voucher, o chi ha pagato ha diritto al rimborso?
- [ ] **Segreteria comunale**: è richiesta una verifica di identità o residenza? (rilevante solo se la struttura tariffaria distinguerà i residenti)
- [ ] **Curatore**: come si registrano i visitatori senza codice fiscale (es. stranieri), visto che il profilo lo richiede?
- [ ] **Curatore**: l'annullo di una fascia gratuita genera qualcosa, visto che il voucher vale solo sulle fasce a pagamento?
- [ ] **Curatore**: la fascia gratuita "per i ragazzi" è riservata a loro o aperta a tutti? Se è riservata, come si concilia con la regola che al lancio prenota solo un maggiorenne?
- [ ] **Curatore**: orario settimanale di default (al lancio 9–23, da confermare con l'amministrazione) e periodi di indisponibilità; sopralluogo tecnico — punti di montaggio dei due lucchetti, compatibilità dei varchi, esistenza di chiavi di servizio (bagni, quadro luci): se esistono, restano in un box aperto interno
- [ ] **Direttivo NEOS**: accordo formale col Comune per gestione e incassi, comprensivo dell'autorizzazione a usare lo stemma comunale (ed eventuale file ufficiale); struttura tariffaria (elenco degli sport, importi per sport e fascia, orario della fascia gratuita); titolare del trattamento dei dati personali; rotazione del reperibile
- [ ] **Sviluppo**: scelta del PSP (Stripe / Satispay / PayPal); provider email e SMS (es. Twilio per gli SMS); dettagli di integrazione dell'API igloohome (algoPIN, massimo 199 PIN attivi per lucchetto, PIN non revocabili da remoto). Verificare se il limite di 199 PIN attivi conta i PIN già generati per l'intero orizzonte di prenotazione: con slot da 60 minuti e orizzonte di 14 giorni, un orario di apertura di 14 ore al giorno arriva a 196 PIN

## Rischi
Probabilità e impatto sono stime preliminari, da rivedere con gli interessati.

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| L'autocertificazione non copre adeguatamente danni e infortuni | TBD — parere legale | Alto | Ottenere il parere legale prima del lancio |
| Lucchetto guasto, batteria scarica o orologio fuori sincrono impediscono l'accesso | Bassa | Alto | Reperibile con numero pubblicato; giro periodico di manutenzione (batterie + risincronizzazione) |
| Lucchetti non richiusi a fine slot | Media | Medio | Impegno esplicito nell'autocertificazione; segnalazione del prenotante successivo; intervento del reperibile |
| Chi annulla nel giorno dello slot ha già visto un PIN non revocabile | Bassa | Basso | Rischio accettato: la rivelazione dalla mezzanotte riduce la finestra; contesto di paese |
| Mancato pagamento dei contanti in esercizio | Bassa | Basso | Riconciliazione per nome, sospensione del profilo; controllo sociale di comunità |
| Prenotazioni di minorenni senza valida assunzione di responsabilità | Bassa | Alto | Regola 18+ al lancio; estensione demandata ai legali |
| Fasce gratuite prenotate e non usate (no-show invisibile) | Media | Basso | Scelta consapevole al lancio; rivalutare col primo periodo (check-in in app o variante connessa) |
| Una sola persona occupa molte fasce gratuite, senza limiti di prenotazione per utente | Media | Medio | Monitorare nel primo periodo; introdurre un limite per utente se necessario |
| Riconciliazione dei contanti per nome ambigua in caso di omonimi | Bassa | Basso | Il gestore annota anche data e orario dello slot |
| Chi paga in contanti riceve il PIN prima di aver pagato | Media | Basso | Rischio coperto dalla sospensione del profilo dopo il mancato pagamento |

---
*Stato: BOZZA — requisiti consolidati con sessione di grilling del 3 novembre 2026. Pianificazione dell'implementazione da eseguire con /plan.*
