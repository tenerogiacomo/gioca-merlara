# Gioca Merlara

Servizio web per prenotare la piattaforma polivalente di Merlara e accedervi in autonomia, senza personale in loco. Curato da NEOS APS.

Requisiti e decisioni di prodotto: [`.claude/prds/gioca-merlara.prd.md`](.claude/prds/gioca-merlara.prd.md). Piano della milestone 1: [`.claude/plans/prenotazione-regolamentata.plan.md`](.claude/plans/prenotazione-regolamentata.plan.md).

## Requisiti

- Node.js 24 o successivo (npm incluso)
- Un progetto Supabase, necessario dallo step S3 in poi

## Avvio

```bash
npm install
cp .env.example .env.local   # poi compila i valori
npm run dev                  # http://localhost:3000
```

Per i test end-to-end serve una volta sola il browser di Playwright:

```bash
npx playwright install chromium
```

### Variabili d'ambiente

Tutte le variabili sono descritte in [`.env.example`](.env.example). Dal pannello Supabase:

| Variabile                       | Dove si trova                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project Settings → Data API → Project URL                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → `anon` `public`                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Project Settings → API Keys → `service_role` (segreta, solo server)             |
| `SUPABASE_DB_PASSWORD`          | Scelta alla creazione del progetto; si reimposta da Project Settings → Database |

I nomi delle voci del pannello possono cambiare nel tempo. `.env.local` non va mai in git.

## Comandi

| Comando                                   | Cosa fa                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                             | Server di sviluppo                                                       |
| `npm run build`                           | Build di produzione                                                      |
| `npm run lint`                            | ESLint                                                                   |
| `npm run format` / `npm run format:check` | Formatta / verifica la formattazione con Prettier                        |
| `npm run typecheck`                       | Genera i tipi delle route e verifica TypeScript                          |
| `npm test`                                | Test unitari con Vitest, senza rete; girano anche su GitHub              |
| `npm run test:watch`                      | Test unitari in modalità watch                                           |
| `npm run test:e2e`                        | Test end-to-end con Playwright su viewport da smartphone; solo in locale |

A ogni pull request GitHub Actions esegue lint, formattazione, typecheck e test unitari.

## Struttura

```
src/app/          pagine e layout (Next.js App Router)
src/components/ui componenti di interfaccia di base
e2e/              test end-to-end Playwright
.claude/          PRD, piani e configurazione degli strumenti di sviluppo
DESIGN.md         regole di stile dell'interfaccia
```

## Convenzioni

- **Naming**: file e cartelle in kebab-case, componenti React in PascalCase. Codice e dominio in inglese; testi dell'interfaccia in italiano.
- **Errori**: gli errori di dominio sono tipizzati e le server actions li restituiscono come risultato (`{ ok: false, error }`), non come eccezioni. Le eccezioni restano per i guasti imprevisti.
- **Test**: unitari accanto al modulo (`modulo.test.ts`), end-to-end in `e2e/`. La logica si scrive test-first.
- **Stile**: l'interfaccia segue solo [`DESIGN.md`](DESIGN.md). Le richieste di modifica al frontend puro si annotano tra le "Modifiche rinviate" di `DESIGN.md`.
- **Next.js 16**: alcune API differiscono dalle versioni precedenti; prima di scrivere codice consultare la guida inclusa in `node_modules/next/dist/docs/` (vedi [`AGENTS.md`](AGENTS.md)).

## Crediti

- Stemma del Comune di Merlara: [Merlara-Stemma.svg](https://commons.wikimedia.org/wiki/File:Merlara-Stemma.svg), Wikimedia Commons, licenza [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Versione ottimizzata con SVGO in `public/brand/merlara-coat-of-arms.svg`, distribuita con la stessa licenza. Lo stemma è un'insegna ufficiale: il suo uso richiede l'autorizzazione del Comune.
- Logo NEOS APS: proprietà dell'associazione.
