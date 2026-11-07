# Sotto-piano S1 — Fondamenta del progetto e `DESIGN.md`

**Piano padre**: `.claude/plans/prenotazione-regolamentata.plan.md`
**Branch**: `m1/s1-fondamenta`
**Richiede Task 0**: No
**Revisione di sicurezza**: No
**Complessità**: Media

## Obiettivo
Avere un progetto Next.js funzionante, con controlli automatici in locale e su GitHub, e le regole di stile del committente scritte in `DESIGN.md` e tradotte nel tema Tailwind e in pochi componenti base. Nessuna funzionalità di prodotto: solo le fondamenta su cui poggiano gli step successivi.

## Specifiche
- **Stack**: Next.js 16.4 (App Router, cartella `src/`), React 19.3, TypeScript 6.0.3 fissato (non la 7), Tailwind 4.3, npm, Node 24.
- **Qualità del codice**: ESLint (configurazione flat, lanciato direttamente: Next.js 16 non ha più `next lint`) e Prettier.
- **Test**:
  - `npm test`: Vitest, solo test senza rete; gira anche su GitHub.
  - `npm run test:e2e`: Playwright su viewport da smartphone, in locale. In S1 contiene un solo test.
- **Integrazione continua**: GitHub Actions a ogni pull request e push su `main`: install, lint, typecheck, `npm test`.
- **Segreti**: `.env.local` fuori da git; `.env.example` documenta ogni variabile, compresa la chiave di servizio Supabase che serve da S3 (solo server, mai nel browser).
- **`DESIGN.md`**: nella radice del repository, scritto da Claude a partire dalle indicazioni verbali del committente e approvato da lui. Contiene una sezione "Modifiche rinviate" per le richieste di stile da realizzare a fine progetto.
- **Componenti base**: pulsante, campo di testo con etichetta ed errore, messaggio (informazione, successo, errore). Seguono solo `DESIGN.md`; accessibili per costruzione (etichette collegate, focus visibile, stato disabilitato).
- **Pagina iniziale**: segnaposto con il nome del servizio, stilizzata con il tema.

## Sottotask

### 1.1 Branch e documenti di progetto
- **Azione**: creare il branch `m1/s1-fondamenta`; mettere sotto git PRD, piani e `.claude/settings.json` (configurazione condivisa del plugin ECC).
- **Verifica**: `git status` pulito dopo il commit; `.env.local` non esiste o è ignorato.

### 1.2 Scaffolding Next.js
- **Azione**: generare il progetto con `create-next-app` (TypeScript, App Router, `src/`, Tailwind, ESLint), poi fissare TypeScript a 6.0.3 e il campo `engines` a Node 24. Mantenere i file `.gitignore` ed `.env.example` già presenti, unendo le voci generate.
- **Verifica**: `npm run dev` serve la pagina iniziale; `npm run build` termina senza errori.

### 1.3 Lint, formattazione e typecheck
- **Azione**: configurare ESLint e Prettier; script `lint`, `format`, `format:check`, `typecheck` (`tsc --noEmit`).
- **Verifica**: `npm run lint && npm run format:check && npm run typecheck` passano.

### 1.4 Vitest
- **Azione**: configurare Vitest con React Testing Library e ambiente DOM per i componenti; script `test` e `test:watch`; un primo test di esempio.
- **Verifica**: `npm test` passa e non apre connessioni di rete.

### 1.5 Playwright
- **Azione**: configurare Playwright con un progetto su viewport da smartphone (Chromium), avvio automatico del server di sviluppo, script `test:e2e`; installare il solo browser Chromium.
- **Verifica**: `npm run test:e2e` apre la pagina iniziale su viewport mobile e trova il nome del servizio.

### 1.6 Integrazione continua
- **Azione**: `.github/workflows/ci.yml` con Node 24 e cache npm: `npm ci`, lint, format:check, typecheck, `npm test`.
- **Verifica**: il workflow risulta verde sulla pull request di S1.

### 1.7 Variabili d'ambiente
- **Azione**: completare `.env.example` aggiungendo `SUPABASE_SERVICE_ROLE_KEY` con l'avvertenza "solo server"; aggiungere a `.gitignore` gli output di test (`test-results/`, `playwright-report/`, `coverage/`).
- **Verifica**: `git check-ignore .env.local` conferma che è ignorato.

### 1.8 `DESIGN.md` con il committente
- **Azione**: Claude pone a voce le domande di stile, raggruppate per tema, e scrive `DESIGN.md` con le risposte. Il committente lo approva o lo corregge. Nessun mockup, nessuna anteprima. Temi delle domande:
  - carattere generale del servizio (es. istituzionale, sportivo, di comunità);
  - colori: principale, secondario, neutri, colori di stato (successo, errore, avviso), eventuale modalità scura;
  - tipografia: famiglia dei caratteri, dimensioni, pesi;
  - spaziature, arrotondamento degli angoli, ombre;
  - componenti: aspetto dei pulsanti, dei campi, dei messaggi;
  - icone: se usarle e con quale libreria;
  - tono dei testi: formale o informale, del "tu" o del "lei";
  - eventuali riferimenti (logo del Comune o di NEOS, siti da cui prendere ispirazione).
- **Verifica**: il committente approva `DESIGN.md`.

### 1.9 Tema e componenti base
- **Azione**: tradurre `DESIGN.md` nel tema Tailwind 4 (variabili in CSS); realizzare pulsante, campo di testo e messaggio in `src/components/ui/`; applicare il tema alla pagina iniziale. Se `DESIGN.md` non copre un dettaglio, chiedere al committente invece di decidere.
- **Verifica**: test con React Testing Library: ogni campo ha un'etichetta collegata, l'errore è annunciato agli screen reader, il pulsante disabilitato non riceve clic.

### 1.10 README e convenzioni
- **Azione**: README con descrizione breve, requisiti, comandi (avvio, test, lint), struttura delle cartelle e convenzioni:
  - naming: file in kebab-case, componenti in PascalCase, dominio in inglese, testi dell'interfaccia in italiano;
  - errori di dominio tipizzati, restituiti dalle server actions come risultato;
  - test accanto al modulo (`*.test.ts`), end-to-end in `e2e/`.
- **Verifica**: una persona che clona il repository avvia il progetto seguendo solo il README.

### 1.11 Revisione e pull request
- **Azione**: `/code-review` sulle modifiche; pull request con `gh` verso `main`; merge dopo l'ok del committente; stato di S1 aggiornato nel piano padre.
- **Verifica**: CI verde sulla pull request.

## File coinvolti
| File | Azione |
|---|---|
| `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts` | CREATE |
| `eslint.config.mjs`, `.prettierrc`, `.prettierignore` | CREATE |
| `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts` | CREATE |
| `.github/workflows/ci.yml` | CREATE |
| `.gitignore`, `.env.example` | UPDATE |
| `DESIGN.md` | CREATE |
| `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` | CREATE |
| `src/components/ui/` | CREATE |
| `e2e/home.spec.ts` | CREATE |
| `README.md` | UPDATE |

## Ordine
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.10 per la parte tecnica. La 1.8 può avvenire in qualsiasi momento, anche subito; la 1.9 parte solo dopo l'approvazione di `DESIGN.md`. La 1.11 chiude lo step.

## Criteri di uscita
- [ ] `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` passano in locale e su GitHub
- [ ] `npm run test:e2e` passa su viewport mobile
- [ ] `npm run build` termina senza errori
- [ ] `DESIGN.md` approvato dal committente e applicato a tema e componenti base
- [ ] Nessun segreto in git
- [ ] README sufficiente per avviare il progetto

## Rischi
| Rischio | Mitigazione |
|---|---|
| `create-next-app` installa TypeScript 7 | Fissare 6.0.3 subito dopo lo scaffolding e verificare con `npm ls typescript` |
| Configurazione ESLint generata non compatibile con typescript-eslint 8.72 | Verificare `npm run lint` già nel sottotask 1.3 |
| Componenti base creati prima di sapere quali schermate servono | Limitarli ai tre previsti; gli altri nascono negli step che li usano |

## Rollback
Revert della pull request di S1: lo step non tocca servizi esterni.
