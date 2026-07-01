# CLAUDE.md — TeQF Website

Guida di contesto per lavorare su questo progetto. Leggere questo file all'inizio di ogni sessione.

## Cos'è il progetto

**TeQF (Te Quiero Feliz)** — applicazione gestionale per un'azienda di wedding & event planning.
Non è un sito vetrina: è un'app completa con area pubblica + più aree riservate (staff, planner, admin, clienti).

- Produzione: https://www.tequierofeliz.com
- Repo GitHub: https://github.com/TeQuieroFeliz/teqf.git (branch `main`)
- Deploy: **Vercel** (ogni push su `main` fa deploy automatico)

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Firebase**: Firestore (DB), Auth, Storage, Admin SDK (server)
- **Tailwind CSS v4** + **shadcn/ui** (componenti in `src/components/ui`)
- **Zod** + **react-hook-form** per form e validazione
- **@tanstack/react-query** e **react-table**
- PDF: `jspdf` / `jspdf-autotable`; Email: `nodemailer` + `resend`
- Immagini: `sharp`, `@imgly/background-removal`, `react-easy-crop`, `heic2any`
- i18n custom (EN/ES) — vedi `src/locales` e `src/hooks/useI18n.ts` / `useT.ts`

## Comandi

```bash
npm run dev      # sviluppo locale (localhost:3000)
npm run build    # build di produzione (typecheck + eslint ATTIVI, non ignorati)
npm run lint     # eslint
npx tsc --noEmit # solo typecheck
```

`next.config.ts` NON ignora errori TS né ESLint in build → il codice deve compilare pulito o Vercel fallisce il deploy.

## Struttura

```
src/
  app/            # route App Router (pubbliche + aree riservate) e /api routes
  actions/        # server actions per dominio (event, weddings, cash-control via teqf, blog, planner, ecc.)
  components/     # ui/ (shadcn), admin/, planner/, user/, cash-control/, shared/
  context/        # 4 context di auth (vedi nota architettura)
  firebase/       # client.ts (browser) + server.ts (Admin SDK, con stub se mancano le env)
  lib/            # tipi, schemi zod, permessi, i18n, utility, cash-control/, furniture/, server/
  locales/        # traduzioni EN/ES
  hooks/          # useI18n, useT
  middleware.ts   # password-gate del sito (cookie site_auth)
```

Alias import: `@/*` → `./src/*`

## Domini funzionali

- **Matrimoni / Eventi** (`weddings`, con functions e versions)
- **Cash Control** — contabilità eventi: chiusure conto, ruoli, report via email (namespace `teqf`)
- **Planner / Team** — gestione planner, progetti, calendario, orario di lavoro
- **Fiori** (flowers) e **Arredi** (furniture) con categorie bilingui
- **Portfolio**, **Blog**, **Catalogo** (parte pubblica)

## Modello di autenticazione e permessi

- Due sistemi Firebase: **client** (`src/firebase/client.ts`) e **Admin SDK server** (`src/firebase/server.ts`).
- Team utente: `[]`, `['XB']`, `['TeQF']`, o entrambi. Vedi `src/lib/user-permissions.ts`.
  - `XB` → gestione eventi
  - `TeQF` → cash control + orario
  - SuperAdmin → accesso totale
- Le **Firestore rules** (`firestore.rules`) sono la fonte di verità della sicurezza — se cambi l'accesso ai dati, aggiorna sempre le rules.
- Il sito ha un password-gate globale via `middleware.ts` (env `SITE_PASSWORD`, cookie `site_auth`). Se `SITE_PASSWORD` non è settata, il sito è pubblico.

## ⚠️ Debito tecnico noto (NON introdurne altro)

1. **Aree admin/auth duplicate.** Esistono superfici parallele sovrapposte:
   `/admin`, `/admin-dashboard`, `/planner`, `/area-planner`, `/dashboard`, `/user-dashboard`.
   E **4 context di auth separati**: `AuthContext`, `AdminAuthContext`, `CashControlAuthContext`, `PlannerAuthContext`
   (→ più `onAuthStateChanged` in parallelo). Consolidamento pianificato in `ADMIN_CONSOLIDATION_DECISION.md`.
   Quando possibile, riusare l'esistente invece di creare una nuova area/context.

2. Storico bug/fix documentato in `AUDIT_REPORT.md` e `FIXES_APPLIED.md` — consultare prima di toccare
   auth, cash-control o firestore.rules.

## Convenzioni

- **Server actions** in `src/actions/<dominio>/` per la logica dati; i componenti client le chiamano.
- Validazione con **Zod** (schemi in `src/lib/schemas/`).
- Tipi condivisi in `src/lib/*-types.ts` (`teqf-types`, `planner-types`, `wedding-types`, `admin-types`, `types`).
- Testo UI sempre via i18n (EN/ES), mai stringhe hardcoded nelle nuove feature.
- Componenti UI: preferire shadcn (`src/components/ui`) invece di reinventare.
- `ignoreUndefinedProperties: true` su Firestore → attenzione ai campi `undefined`.

## Workflow di lavoro (con Claude / Cowork)

- La cartella del progetto è collegata: Claude legge e modifica i file **direttamente**.
- **Git lo gestisce Claude**: dopo modifiche approvate fa `add` (solo dei file toccati), `commit` e `push` su `origin main` → Vercel fa il deploy.
- Convenzione commit: prefisso tipo `feat(scope):`, `fix(scope):`, `refine(scope):` (come lo storico esistente).
- Prima di ogni push su una modifica non banale: `npm run build` deve passare (altrimenti Vercel fallisce).
- Test: Playwright configurato in `tests/` (`playwright.config.ts`).

## Note operative

- File `._*` e `.DS_Store`: artefatti macOS (SSD esterno), ignorarli.
- Env: `.env.local` (locale). Le variabili di produzione sono su Vercel.
- Al 2026-07-01 c'è lavoro non committato su **cash-control** (deciso a parte con Luigi).
