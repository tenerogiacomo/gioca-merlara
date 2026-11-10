# DESIGN.md — Gioca Merlara

**Stato**: approvato dal committente il 7 novembre 2026. Eventuali modifiche si valutano quando arriva l'interfaccia.

Regole di stile dell'interfaccia. Le decisioni sono del committente; il codice segue solo questo documento. Se un caso non è coperto, si chiede al committente e si aggiorna il documento. Le modifiche al frontend puro chieste durante i lavori vanno in "Modifiche rinviate" (§11) e si realizzano a fine progetto.

## 1. Carattere

Di comunità, con un accento sportivo. **Non istituzionale.** Mobile-first: l'utente-tipo è un residente o un visitatore che prenota da smartphone.

## 2. Colori

Tre colori base, scelti dal committente; tutto il resto ne deriva.

| Nome           | Hex       | Ruolo                                                              |
| -------------- | --------- | ------------------------------------------------------------------ |
| Deep Blue      | `#09318D` | Colore principale: titoli, pulsanti principali, link, focus        |
| Pure White     | `#FFFFFF` | Superfici (schede, campi) e testo su Deep Blue                     |
| Bubblegum Pink | `#FD91CC` | Accento: evidenziazioni, badge, slot selezionato, elementi grafici |

**Nessuna modalità scura.**

### Scale derivate

Ricavate in OKLCH mantenendo la tonalità dei colori base. I colori base occupano i gradini `blue-700` e `pink-300`.

| Gradino | blue          | pink          | neutral   | success   | warning   | error     |
| ------- | ------------- | ------------- | --------- | --------- | --------- | --------- |
| 50      | `#F0F5FF`     | `#FFF1F7`     | `#F3F5F9` | `#E0FFE5` | `#FFF3E4` | `#FFF2F0` |
| 100     | `#DDE8FE`     | `#FEDDED`     | `#E4E8F0` | `#CCF4D3` | `#FFE3BE` | `#FEE0DC` |
| 200     | `#BAD2FF`     | `#FFB9DD`     | `#CDD1D9` | `#90E9A3` | `#FEC675` | `#FEBFB9` |
| 300     | `#92B4F6`     | **`#FD91CC`** | `#B0B4BC` | `#73CB87` | `#E4A74A` | `#FC928A` |
| 400     | `#6C93E3`     | `#D36DA6`     | `#91959D` | `#52AB69` | `#C38824` | `#DA736C` |
| 500     | `#4973CB`     | `#AF5187`     | `#74777F` | `#318C4C` | `#9F6C0A` | `#B8544F` |
| 600     | `#2A54B0`     | `#8B3868`     | `#575B62` | `#0E6D32` | `#7A5209` | `#963633` |
| 700     | **`#09318D`** | `#6E2551`     | `#42454C` | `#035424` | `#5E3D01` | `#7C1D1E` |
| 800     | `#022681`     | `#55173D`     | `#303339` | `#023E19` | `#462D01` | `#65000A` |
| 900     | `#00175C`     | `#3D092A`     | `#1F2228` | `#062911` | `#301D01` | `#3A1412` |

I neutri sono grigi leggermente freddi, con la tonalità del Deep Blue. I colori di stato sono convenzionali (verde, ambra, rosso) con luminosità allineata alle altre scale.

### Ruoli

| Ruolo                         | Colore                                          | Contrasto               |
| ----------------------------- | ----------------------------------------------- | ----------------------- |
| Sfondo pagina                 | `neutral-50`                                    | —                       |
| Superfici (schede, campi)     | `white`                                         | —                       |
| Testo principale              | `neutral-900`                                   | 14,6:1 su sfondo pagina |
| Testo secondario              | `neutral-600`                                   | 6,3:1 su sfondo pagina  |
| Titoli e link                 | `blue-700`                                      | 10,5:1 su sfondo pagina |
| Bordi dei campi               | `neutral-500`                                   | 4,5:1 su bianco         |
| Divisori e bordi delle schede | `neutral-200`                                   | decorativi              |
| Accento come sfondo           | `pink-300` con testo `blue-700` o `neutral-900` | 5,5:1 / 7,7:1           |
| Accento leggero               | `pink-100` con testo `blue-700`                 | 9,1:1                   |
| Testo rosa, se serve          | `pink-600`                                      | 7,3:1 su bianco         |

**Regola sul rosa**: `#FD91CC` sul bianco ha contrasto 2,1:1. Non si usa mai per testo, bordi di campi o anelli di focus su bianco; solo come sfondo con testo scuro sopra o come elemento decorativo.

Tutti i testi rispettano WCAG AA (almeno 4,5:1); bordi dei campi e indicatori di focus almeno 3:1.

## 3. Tipografia

Font gratuito da Google Fonts, caricato con `next/font` (nessuna richiesta a Google dal browser).

| Uso                                   | Famiglia                | Perché                                                    |
| ------------------------------------- | ----------------------- | --------------------------------------------------------- |
| Titoli (pagina, sezione, sottotitolo) | **Bricolage Grotesque** | Carattere personale, "di quartiere", con energia sportiva |
| Testo, etichette, pulsanti, campi     | **Figtree**             | Semplice e molto leggibile                                |

Entrambe variabili: un solo file per famiglia, con tutti i pesi. Ripiego: font di sistema sans-serif.

Scala mobile-first, base 16 px:

| Uso                  | Dimensione | Interlinea | Peso |
| -------------------- | ---------- | ---------- | ---- |
| Titolo di pagina     | 30 px      | 1,2        | 700  |
| Titolo di sezione    | 24 px      | 1,25       | 700  |
| Sottotitolo          | 20 px      | 1,3        | 600  |
| Testo in evidenza    | 18 px      | 1,5        | 400  |
| Testo                | 16 px      | 1,5        | 400  |
| Etichette e pulsanti | 16 px      | 1,25       | 600  |
| Testo piccolo, aiuti | 14 px      | 1,4        | 400  |

- I campi usano sempre almeno 16 px: sotto questa soglia iOS ingrandisce la pagina al tocco.
- Righe di testo lunghe: massimo circa 70 caratteri.
- Maiuscole solo a inizio frase, mai testi interi in maiuscolo.

## 4. Spaziature e densità

Interfaccia **abbastanza densa, non ariosa**. Griglia di base 4 px.

| Uso                           | Valore     |
| ----------------------------- | ---------- |
| Margine laterale della pagina | 16 px      |
| Spazio tra etichetta e campo  | 4 px       |
| Spazio tra campi di un form   | 12 px      |
| Padding interno delle schede  | 16 px      |
| Spazio tra sezioni            | 24 px      |
| Area minima toccabile         | 44 × 44 px |

## 5. Forme, ombre ed effetti

- **Arrotondati**: campi e pulsanti 12 px; schede 16 px; badge a pillola.
- **Ombre sì**: morbide, tinte di Deep Blue, su due livelli.
  - _Scheda_: `0 1px 2px rgb(9 49 141 / 0.06), 0 2px 8px rgb(9 49 141 / 0.08)`
  - _In primo piano_ (pannelli, finestre): `0 4px 12px rgb(9 49 141 / 0.10), 0 12px 32px rgb(9 49 141 / 0.12)`
- **Effetto glass**: da valutare con il committente quando si progetta l'interfaccia. Non si usa finché non viene approvato.

## 6. Pulsanti

| Variante   | Aspetto                                                  | Uso                                                    |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Principale | Pieno `blue-700`, testo bianco; hover/premuto `blue-800` | L'azione principale della schermata, una sola          |
| Secondario | Sfondo bianco, bordo e testo `blue-700`                  | Azioni alternative                                     |
| Testuale   | Solo testo `blue-700`, sottolineato al passaggio         | Azioni minori, "Annulla"                               |
| Pericolo   | Pieno `error-600`, testo bianco                          | Azioni distruttive, come l'annullo di una prenotazione |

- Altezza minima 44 px, padding orizzontale 16 px, testo 16 px peso 600.
- Su smartphone l'azione principale di un form occupa tutta la larghezza.
- Disabilitato: sfondo `neutral-200`, testo `neutral-500`, nessuna ombra.
- In corso: il testo cambia (es. "Prenotazione in corso…") e il pulsante si disabilita; niente icone o spinner.
- Focus da tastiera: anello `blue-700` di 2 px, distanziato 2 px.

## 7. Campi dei form

- Bordo completo `neutral-500` da 1 px, sfondo bianco, raggio 12 px, altezza minima 44 px, testo 16 px.
- **Etichetta sopra il campo**, sempre visibile; niente etichette dentro il campo.
- Testo d'aiuto sotto l'etichetta, 14 px `neutral-600`.
- Focus: bordo `blue-700` più anello di 2 px.
- Errore: bordo `error-600`, messaggio sotto il campo in `error-700`, 14 px, che dice cosa è successo e cosa fare.
- Il segnaposto non sostituisce mai l'etichetta.

## 8. Messaggi

Riquadro arrotondato 12 px, sfondo gradino 50, bordo gradino 200, testo gradino 800 della scala corrispondente:

| Tipo         | Scala   |
| ------------ | ------- |
| Informazione | blue    |
| Successo     | success |
| Avviso       | warning |
| Errore       | error   |

Il tipo si capisce dal testo e dal titolo, non solo dal colore.

## 9. Icone

**Nessuna icona per ora.** Se in un caso servono, si sceglie la libreria con il committente.

## 10. Tono dei testi

- Si dà del **tu**.
- Colloquiale e diretto, da comunità; frasi brevi.
- Verbi d'azione sui pulsanti: "Prenota", "Annulla la prenotazione", "Salva il profilo".
- I messaggi d'errore dicono cosa è successo e cosa fare, senza colpevolizzare.
- Nessun riferimento visivo esterno da seguire.

## 12. Loghi

File in `public/brand/`.

| File                       | Contenuto                           | Dove si usa                                                                        |
| -------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| `neos-on-light.png`        | Logo NEOS blu scuro con "O" sfumata | Su sfondi chiari (bianco, `neutral-50`)                                            |
| `neos-on-dark.png`         | Logo NEOS bianco con "O" sfumata    | Su sfondi scuri (Deep Blue)                                                        |
| `merlara-coat-of-arms.svg` | Stemma del Comune di Merlara        | Solo in grande (pagina di accesso, piè di pagina); troppo dettagliato per le icone |

- I loghi non si ricolorano, non si deformano e non si ritagliano.
- **Icona del sito**: per ora nessuna. Il committente fornirà la "O" sfumata di NEOS.
- **Convivenza dei due loghi** (scelta delegata a Claude il 10 novembre 2026): logo NEOS (`neos-on-light.png`) nell'intestazione di ogni pagina, alto 32 px, con collegamento alla pagina iniziale; stemma del Comune nel piè di pagina, alto 48 px, accanto alla dicitura "In collaborazione con il Comune di Merlara" in testo piccolo `neutral-600`. NEOS è il curatore del servizio; lo stemma, molto dettagliato, non va rimpicciolito oltre.
- **Stemma**: disegno da Wikimedia Commons (CC BY-SA 4.0), ottimizzato. L'uso dello stemma va autorizzato dal Comune prima del lancio; crediti nel README.

## 11. Modifiche rinviate

Richieste di modifica al frontend puro emerse durante i lavori, da realizzare a fine progetto.

- **Nuovo design di accesso e pagina iniziale** (annunciato dal committente il 10 novembre 2026): sostituirà il look and feel di `/`, `/accedi` e `/accedi/codice`. Queste schermate sono isolate in pochi componenti per facilitare il restyling.
