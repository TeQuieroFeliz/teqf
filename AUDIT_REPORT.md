# AUDIT REPORT — teqf-website
_Generated: 2026-06-05 — covers src/ snapshot at HEAD after Parti 1+2+4_

---

## A. Bug e Conflitti

### 🔴 Critici

**A1 · `firestore.rules` — Cash Control aperto a tutti gli autenticati**
- File: `firestore.rules`, match `/cashControlEvents`, `/cashControlExpenses`, ecc.
- Causa: `allow read, write: if isAuth()` — qualunque utente autenticato legge/scrive la contabilità.
- Fix applicato (BUG-01): `if hasTeam('TeQF') || isSuperAdmin()`. `cashControlAudit` reso append-only.

**A2 · `firestore.rules` — `/admins/{uid}` leggibile da qualunque autenticato**
- File: `firestore.rules`
- Causa: `allow read: if isAuth()` espone email, nome e permessi di tutti gli admin.
- Fix applicato (BUG-02): `allow read: if isOwner(uid) || isSuperAdmin()`.

**A3 · `PlannerAuthContext` — Race condition su switch utente (BUG-03)**
- File: `src/context/PlannerAuthContext.tsx`
- Causa: nessun `requestId` — callback di un auth precedente può sovrascrivere lo stato del nuovo utente.
- Fix applicato: pattern `requestId` / `myReq !== requestId`.

**A4 · `PlannerAuthContext` — Spinner infinito se `onSnapshot` viene rifiutato (BUG-04)**
- File: `src/context/PlannerAuthContext.tsx`
- Causa: `setIsLoading(false)` chiamato solo nel success callback di `onSnapshot`.
- Fix applicato: `onError` handler + safety timeout 6s.

**A5 · `PlannerAuthContext` — `updateDoc(admins, lastLogin)` sempre rifiutato (BUG-05)**
- File: `src/context/PlannerAuthContext.tsx`
- Causa: rules bloccano la scrittura client-side su `/admins`. Il codice silenziosamente fallisce ogni login.
- Fix applicato (BUG-05): rimosso `updateDoc` lato client; resta solo la server action `updatePlannerLastLogin`.

**A6 · `firestore.rules` — XB UI crea eventi ma le rules lo bloccano (BUG-06)**
- File: `firestore.rules`, match `/plannerEvents`
- Causa: `allow create` richiede `canEdit('projects')` che non include i planner XB.
- Fix applicato: aggiunto `|| (isOwner(...plannerId) && hasTeam('XB'))`.

---

### 🟠 Alti

**A7 · 4 `onAuthStateChanged` paralleli (BUG-07)**
- File: `src/context/{AuthContext,AdminAuthContext,CashControlAuthContext,PlannerAuthContext}.tsx`
- Causa: ogni context ha un proprio listener Firebase Auth → 4× letture Firestore per ogni cambio auth state.
- Fix rinviato (refactor invasivo). Commento `BUG-07` aggiunto ad `AdminAuthContext` e `CashControlAuthContext`.
- **Refactor proposto**: creare un `FirebaseUserProvider` a root con un unico `onAuthStateChanged`; tutti i context leggono da esso via context o Zustand.

**A8 · Flash di contenuto protetto in `layout.tsx` (BUG-08)**
- File: `src/app/planner/layout.tsx`
- Causa: redirect in `useEffect` è asincrono — i figli vengono renderizzati brevemente prima del redirect.
- Fix applicato: gating render-time prima del `return <>{children}</>`.

**A9 · 12 pagine con `return null` su utente non admin (BUG-09)**
- File: vedi elenco in FIXES_APPLIED.md
- Causa: schermo bianco senza nessun messaggio — UX pessima, invisibile agli screen reader.
- Fix applicato: `<AccessDenied />` component creato + sostituzioni applicate.

**A10 · `/planner/events` scarica tutti gli eventi anche per utenti XB (BUG-10)**
- File: `src/app/planner/events/page.tsx`
- Causa: query globale senza filtro `plannerId`, violando il principio di minor privilegio.
- Fix applicato: branch per ruolo — XB: `where('plannerId','==',uid)`, TeQF/admin: query globale.

**A11 · `PlannerAuthContext` — letture Firestore sequenziali (BUG-12)**
- File: `src/context/PlannerAuthContext.tsx`
- Causa: `await getDoc(admins)` + `await updatePlannerLastLogin` in sequenza.
- Fix applicato: `adminPromise` dichiarato prima del blocco, `lastLoginPromise` fire-and-forget.

**A12 · `hasTeam()` esplode su user senza doc planner (BUG-11)**
- File: `firestore.rules`
- Causa: `plannerData()` chiama `get()` su doc che potrebbe non esistere, causando un errore nelle rules.
- Fix applicato: `plannerTeams()` con `exists()` guard + `data.get('team', [])` default.

---

### 🟡 Medi

**A13 · `getPlannerEvents(plannerUser.id)` usa auto-ID invece di uid (BUG-13)**
- File: `src/app/planner/page.tsx`
- Causa: `plannerUser.id` è il Firestore doc auto-id, non il Firebase Auth uid.
- Fix applicato: `auth.currentUser?.uid ?? plannerUser.id`.

**A14 · Save furniture in 2 round-trip può lasciare doc orfano (BUG-15)**
- File: `src/app/planner/furniture/page.tsx`, `saveStandbyItem`
- Causa: `saveFurnitureItem(images:[])` + `updateFurnitureImages(result.id, [...])` — se la seconda fallisce, il doc esiste ma senza immagine.
- Fix applicato: `images: [s.imageUrl]` passato direttamente alla prima chiamata.

**A15 · `setTimeout` senza cleanup in `furniture/page.tsx` (BUG-16)**
- File: `src/app/planner/furniture/page.tsx`
- Causa: warning React "Can't perform a state update on an unmounted component".
- Fix applicato: `pendingTimeoutsRef` + `useEffect` cleanup.

**A16 · `canManageCatalogs` esclude team TeQF**
- File: `src/context/PlannerAuthContext.tsx`
- Causa: `canManageCatalogs = isSuperAdmin || teamArr.includes('XB')` — Nancy (TeQF) non può accedere al catalogo.
- Fix applicato: aggiunto `teamArr.includes('TeQF')` all'alias.

**A17 · Memory leak potenziale in `cash-control/page.tsx` e `orario-di-lavoro/page.tsx`**
- File: `src/app/planner/cash-control/page.tsx`, `src/app/planner/orario-di-lavoro/page.tsx`
- Causa: `onSnapshot` in `useEffect` ma il listener manca di `onError` handler.
- Fix consigliato: aggiungere `(err) => { console.error('[CashControl]', err); setLoading(false); }` come terzo argomento.
- Severità: 🟡 (non critico ma causa spinner infinito su rules-deny).

**A18 · Tipi `any` in punti di auth**
- File: `src/context/PlannerAuthContext.tsx:222` — `(plannerUser as any)?.team`
- Fix consigliato: aggiungere `team?: string | string[]` alla definizione di `PlannerUser` in `planner-types.ts` e rimuovere il cast.

---

### 🟢 Basso

**A19 · `console.log(error)` in `AuthContext.tsx` (BUG-QW)**
- Fix applicato: `console.error('[AuthContext] auth state change failed', error)`.

**A20 · `updateFurnitureImages` importato ma non più usato in `furniture/page.tsx`**
- Dopo BUG-15 fix, `updateFurnitureImages` è rimasto nell'import. Genera warning lint ma non blocca il build.
- Fix consigliato: rimuovere dall'import.

---

## B. Suggerimenti per pagina

### Dashboard (`/planner`)
- **Stato attuale**: 4 sub-componenti (SuperAdmin, TeQF, XB, AllTiles) in un unico file da ~880 righe.
- **Problemi UX**: header duplicato 4 volte; nessun empty state per "nessun team".
- **Suggerimenti**: (1) estrarre `PlannerHeader` come componente condiviso; (2) spostare logica tile-selection in un hook `useDashboardTiles`; (3) aggiungere skeleton loader per la lista eventi; (4) virtual scroll per liste lunghe (>50 eventi); (5) collegare il badge "richieste" a Firestore real-time invece di getDocs.
- **Pattern fetch**: `onSnapshot` invece di `getDocs` per la lista eventi admin (già real-time per plans).
- **Loading**: spinner attuale OK; aggiungere skeleton card per lista eventi.
- **Permessi**: ✅ corretto dopo fix; XB non vede cash-control; TeQF non vede "Richieste".

### Eventi (`/planner/events`)
- **Stato attuale**: lista piatta con ricerca client-side.
- **Problemi UX**: nessuna paginazione (scarica tutti gli eventi in memoria); nessun filtro per data o stato.
- **Suggerimenti**: (1) paginazione con cursor (`startAfter`); (2) filtri lato query (status, città, data); (3) aggiungere link diretto a orario/cash-control da ogni card; (4) skeleton loader.
- **Pattern fetch**: `onSnapshot` con query paginata e `orderBy('createdAt','desc')`.
- **Permessi**: ✅ corretto dopo BUG-10 fix — XB vede solo i propri.

### Mobili (`/planner/furniture`)
- **Stato attuale**: upload bulk, standby queue, edit inline — 900+ righe.
- **Problemi UX**: nessun feedback se utente non ha permesso di edit (fixed con ReadOnlyBanner); bulk upload manca di progress globale; nessuna conferma prima di delete.
- **Suggerimenti**: (1) estrarre `StandbyQueue` e `FurnitureCard` in componenti separati; (2) aggiungere dialog di conferma delete; (3) lazy load immagini con `next/image`; (4) paginazione lista.
- **Pattern fetch**: `getDocs` one-shot all'apertura — OK per catalogo, ma considera `onSnapshot` se un admin modifica in parallelo.
- **Permessi**: ✅ XB vede ReadOnlyBanner, bottoni non disabilitati a livello UI (i server actions lo rifiuteranno, ma non è ideale). Quick win: `disabled={!canEdit}` sui bottoni Add/Delete/Edit.

### Fiori (`/planner/flowers`)
- **Stato attuale**: galleria con upload da portfolio o diretto.
- **Problemi UX**: upload progress non visibile su mobile; picker portfolio non ha ricerca.
- **Suggerimenti**: (1) aggiungere barra di ricerca nel picker; (2) lazy load immagini; (3) paginazione ispirazioni.
- **Permessi**: ✅ ReadOnlyBanner per XB.

### Cash Control (`/planner/cash-control`)
- **Stato attuale**: lista progetti TeQF con `onSnapshot`.
- **Problemi UX**: nessun empty state; accesso XB non gestito (fixed — `canAccess` già presente).
- **Suggerimenti**: (1) aggiungere paginazione; (2) mostrare totale speso/ricevuto nella lista; (3) skeleton loader.
- **Permessi**: ✅ `canAccess = isSuperAdmin || canManageCashControl` — XB vede `AccessDenied` (non ancora esplicitamente ma il layout lo gestisce).

### Orario di Lavoro (`/planner/orario-di-lavoro`)
- **Stato attuale**: stessa struttura di cash-control (condivide actions e layout).
- **Permessi**: ✅ stesso pattern di cash-control.
- **Quick win**: aggiungere `onError` all'`onSnapshot` (stesso rischio spinner-infinito di A17).

### Admin Users (`/planner/planners`)
- **Stato attuale**: lista planner con toggle active/inactive e modal di dettaglio.
- **Problemi UX**: non filtra per team; nessuna paginazione.
- **Permessi**: ✅ `if (!adminUser) return <AccessDenied />` (dopo fix).

---

## C. Architettura

### Provider / Context tree attuale
```
<AuthContextProvider>          ← area pubblica / user dashboard
  <AdminAuthContextProvider>   ← admin-dashboard (legacy)
    <CashControlAuthContextProvider>
      <PlannerAuthContextProvider>  ← /planner
        <PlannerGuard>
          {children}
```
Tutti e 4 aprono `onAuthStateChanged` → 4 chiamate Firebase per ogni evento auth.

### Proposta consolidamento (deferred — BUG-07)
```
<FirebaseUserProvider>        ← unico onAuthStateChanged, espone firebaseUser
  <PlannerAuthContextProvider>  ← legge firebaseUser dal context, aggiunge logica planner
    <PlannerGuard>
      {children}
```
`AdminAuthContext` e `CashControlAuthContext` diventano hook leggeri che leggono da `FirebaseUserProvider`.

### Mappa rotte → ruoli

| Rotta | SuperAdmin | TeQF | XB | Anonimo |
|---|---|---|---|---|
| `/planner` | ✅ | ✅ | ✅ | ❌ → login |
| `/planner/events` | ✅ (tutti) | ✅ (tutti) | ✅ (propri) | ❌ |
| `/planner/furniture` | ✅ edit | ✅ edit | ✅ view | ❌ |
| `/planner/flowers` | ✅ edit | ✅ edit | ✅ view | ❌ |
| `/planner/cash-control` | ✅ | ✅ | ❌ AccessDenied | ❌ |
| `/planner/orario-di-lavoro` | ✅ | ✅ | ❌ AccessDenied | ❌ |
| `/planner/planners` | ✅ | ❌ AccessDenied | ❌ AccessDenied | ❌ |
| `/planner/blog` | ✅ | ❌ AccessDenied | ❌ AccessDenied | ❌ |
| `/planner/portfolio` | ✅ | ❌ AccessDenied | ❌ AccessDenied | ❌ |
| `/planner/requests` | ✅ | ❌ | ❌ | ❌ |
| `/planner/login` | → /planner | → /planner | → /planner | ✅ |

### Hook consigliato `usePermission`
```ts
// Aggiungere un team domani = una riga in sectionPermissionsFor()
function usePermission(section: keyof SectionPermissions, action: 'canView' | 'canEdit') {
  const { permissions } = usePlannerAuth();
  return permissions[section][action];
}
```

---

## D. Quick Wins (≤ 30 min ciascuno)

1. **Rimuovere import `updateFurnitureImages`** da `furniture/page.tsx` (dopo BUG-15 non è più usato).
2. **`disabled={!canEdit}`** sui bottoni "Aggiungi", "Elimina", "Salva" in `furniture/page.tsx` per gli utenti XB.
3. **`disabled={!permissions.florals.canEdit}`** sui bottoni upload/delete in `flowers/page.tsx` per XB.
4. **`loading="lazy"`** su tutte le `<img>` in `flowers/page.tsx` (galleria potenzialmente lunga).
5. **Aggiungere `alt`** ai logo `<Image>` in tutti gli header planner (attualmente `alt="Te Quiero Feliz"` ma i logo-filtrati non descrivono il contenuto semantico).
6. **`aria-label`** al bottone logout (ha solo icona su mobile).
7. **`onError`** sull'`onSnapshot` di `cash-control/page.tsx` e `orario-di-lavoro/page.tsx` (A17).
8. **Rimuovere** `src/app/planner/orario/page.tsx` (sembra un duplicato/stub di `orario-di-lavoro`).
9. **Unificare** `TEQF_TILE_KEYS` in `page.tsx` con la matrice permessi di `sectionPermissionsFor` — attualmente sono due fonti di verità separate.
10. **`team?: string | string[]`** in `PlannerUser` type per eliminare il cast `(plannerUser as any)?.team` in `PlannerAuthContext`.

---

## E. Priorità consigliata (impatto × rischio / costo)

| # | Intervento | Impatto | Rischio attuale | Costo |
|---|---|---|---|---|
| 1 | BUG-01: rules Cash Control | 🔴 critico | 🔴 alto | basso |
| 2 | BUG-02: rules `/admins` | 🔴 critico | 🔴 alto | basso |
| 3 | BUG-03+04: race + spinner infinito | 🔴 blocca login | 🟠 alto | medio |
| 4 | BUG-09: AccessDenied (12 pagine) | 🟠 UX rotta | 🟠 medio | basso |
| 5 | BUG-10: query eventi XB | 🟠 data leak | 🟠 medio | basso |
| 6 | BUG-08: flash contenuto protetto | 🟠 UX/security | 🟡 medio | basso |
| 7 | BUG-06: XB crea eventi | 🟠 funzionale | 🟠 medio | basso |
| 8 | BUG-11: null-safe hasTeam() | 🟡 stabilità | 🟡 medio | basso |
| 9 | Quick wins D1-D5 | 🟡 UX/a11y | 🟢 basso | basso |
| 10 | BUG-07: consolidamento 4 context | 🟡 perf | 🟢 basso | alto |

---

## Refactor Proposti (rinviati)

**REFACTOR-01 (BUG-07): FirebaseUserProvider unificato**
- File coinvolti: tutti e 4 i Context + `src/lib/Providers.tsx` + root layout
- Impatto: -75% di chiamate Firestore su auth state change
- Rischio regressione: alto (tocca auth core)
- Prerequisito: test E2E per tutti i 3 ruoli

**REFACTOR-02: Estrazione `PlannerHeader` condiviso**
- File: `src/app/planner/page.tsx` (880 righe, 4 header duplicati)
- Impatto: DRY, manutenibilità
- Rischio: basso

**REFACTOR-03: Hook `usePlannerEvents` con onSnapshot + paginazione**
- File: `src/app/planner/page.tsx`, `src/app/planner/events/page.tsx`
- Impatto: real-time updates, meno codice duplicato
- Rischio: medio

**REFACTOR-04: Rimuovere `AdminAuthContext`**
- File: `src/context/AdminAuthContext.tsx` + tutti i consumer
- La rotta `/admin` è stata eliminata; il context è ora dead code.
- Prerequisito: verificare nessun consumer rimasto.
