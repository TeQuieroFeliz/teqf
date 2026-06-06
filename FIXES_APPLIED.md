# FIXES APPLIED — teqf-website
_Applied: 2026-06-05_

## Tabella riassuntiva

| ID | Titolo | Severità | File | Stato | Rischio regressione |
|---|---|---|---|---|---|
| BUG-01 | Cash Control rules aperte a tutti | 🔴 | `firestore.rules` | ✅ Applicato | Basso |
| BUG-02 | `/admins/{uid}` leggibile da chiunque | 🔴 | `firestore.rules` | ✅ Applicato | Basso |
| BUG-03 | Race condition switch utente | 🔴 | `PlannerAuthContext.tsx` | ✅ Applicato | Medio |
| BUG-04 | Spinner infinito su onSnapshot rifiutato | 🔴 | `PlannerAuthContext.tsx` | ✅ Applicato | Basso |
| BUG-05 | updateDoc lastLogin sempre rifiutato | 🔴 | `PlannerAuthContext.tsx` | ✅ Applicato | Basso |
| BUG-06 | XB crea eventi ma rules bloccano | 🔴 | `firestore.rules` | ✅ Applicato | Medio |
| BUG-07 | 4 AuthContext con onAuthStateChanged paralleli | 🟠 | AdminAuth + CashControlAuth | ⏳ Rinviato — commento aggiunto | Basso |
| BUG-08 | Flash contenuto protetto in layout | 🟠 | `planner/layout.tsx` | ✅ Applicato | Basso |
| BUG-09 | 12 pagine con `return null` → schermo bianco | 🟠 | 12 file (vedi sotto) | ✅ Applicato | Basso |
| BUG-10 | plannerEvents listener scarica tutto per XB | 🟠 | `events/page.tsx` | ✅ Applicato | Medio |
| BUG-11 | `hasTeam()` esplode senza doc planner | 🟠 | `firestore.rules` | ✅ Applicato | Basso |
| BUG-12 | Letture sequenziali in PlannerAuthContext | 🟡 | `PlannerAuthContext.tsx` | ✅ Applicato | Basso |
| BUG-13 | `getPlannerEvents` usa auto-id invece di uid | 🟡 | `planner/page.tsx` | ✅ Applicato | Basso |
| BUG-14 | Tile "Gestione Utenti" punta a `/admin/users` | 🟡 | `planner/page.tsx` | ✅ Commento aggiunto | Nessuno |
| BUG-15 | Save furniture in 2 round-trip → doc orfano | 🟡 | `furniture/page.tsx` | ✅ Applicato | Basso |
| BUG-16 | `setTimeout` senza cleanup → warning React | 🟡 | `furniture/page.tsx` | ✅ Applicato | Basso |
| BUG-QW | `console.log` in AuthContext | 🟢 | `AuthContext.tsx` | ✅ Applicato | Nessuno |

---

## Dettaglio fix

---

### BUG-01 — Cash Control rules aperte a tutti gli autenticati
**Severità**: 🔴 Critico  
**File originale**: `firestore.rules`, 7 collection `cashControl*`

**Causa radice**: `allow read, write: if isAuth()` — qualsiasi utente autenticato (inclusi planner XB) poteva leggere e scrivere tutta la contabilità aziendale.

**Diff applicata**:
```diff
- match /cashControlProfiles/{doc}  { allow read, write: if isAuth(); }
- match /cashControlEvents/{doc}    { allow read, write: if isAuth(); }
- match /cashControlAssignments/{doc}{ allow read, write: if isAuth(); }
- match /cashControlMoneyReceived/{doc}{ allow read, write: if isAuth(); }
- match /cashControlExpenses/{doc}  { allow read, write: if isAuth(); }
- match /cashControlClosures/{doc}  { allow read, write: if isAuth(); }
- match /cashControlAudit/{doc}     { allow read, write: if isAuth(); }
+ match /cashControlProfiles/{doc}  { allow read, write: if hasTeam('TeQF') || isSuperAdmin(); }
+ // ... (stessa regola per 5 collection)
+ match /cashControlAudit/{doc} {
+   allow read:   if isSuperAdmin();
+   allow create: if hasTeam('TeQF') || isSuperAdmin();
+   allow update, delete: if false;
+ }
```

**Perché questo fix**: minimo privilegio — solo il team che gestisce la cassa deve avere accesso.  
**Rischio regressione**: Basso — `CashControlAuthContext` già controlla `hasTeam('TeQF')` lato client.  
**Test manuali**:
1. Login come utente XB → apri DevTools → `firebase.firestore().collection('cashControlEvents').get()` → deve restituire `permission-denied`.
2. Login come Nancy (TeQF) → stessa query → deve restituire i documenti.
3. Login come SuperAdmin → stessa query → deve restituire i documenti.

---

### BUG-02 — `/admins/{uid}` leggibile da qualunque autenticato
**Severità**: 🔴 Critico  
**File**: `firestore.rules`

**Causa radice**: `allow read: if isAuth()` espone email, nome, permessi e hash di tutti gli admin a qualunque utente autenticato.

**Diff applicata**:
```diff
  match /admins/{uid} {
-   allow read: if isAuth();
-   allow write: if false;
+   allow read:   if isOwner(uid) || isSuperAdmin();
+   allow create, delete: if false;
+   allow update: if isOwner(uid)
+     && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastLogin']);
  }
```

**Perché questo fix**: ogni admin vede solo il proprio doc; solo il SuperAdmin vede tutti. La finestra `update` per `lastLogin` mantiene un fallback client-side valido.  
**Rischio regressione**: Basso — il client legge già solo il proprio UID.  
**Test manuali**:
1. Login come XB → `firebase.firestore().collection('admins').get()` → `permission-denied`.
2. Login come SuperAdmin → `firebase.firestore().collection('admins').get()` → restituisce i doc.
3. Login come SuperAdmin → `firebase.firestore().doc('admins/'+uid).get()` → restituisce il proprio doc.

---

### BUG-03 — Race condition in PlannerAuthContext su switch utente
**Severità**: 🔴 Critico  
**File**: `src/context/PlannerAuthContext.tsx`

**Causa radice**: senza `requestId`, il callback di `onSnapshot` di un login precedente può sovrascrivere lo stato del nuovo utente se l'utente si disconnette e riconnette rapidamente.

**Diff applicata** (estratto):
```diff
+ let requestId = 0;
  const authUnsub = auth.onAuthStateChanged(async (firebaseUser) => {
+   const myReq = ++requestId;
    ...
    plannerUnsub = onSnapshot(uidDocRef, async (uidSnap) => {
+     if (myReq !== requestId) return;
      ...
    });
  });
```

**Rischio regressione**: Medio — testare login → logout → login rapido come utente diverso.  
**Test manuali**:
1. SuperAdmin login → `/planner` (dashboard admin visibile).
2. Logout → immediatamente login come XB.
3. Verificare: dashboard XB caricata, nessun dato dell'admin visibile.

---

### BUG-04 — Spinner infinito se `onSnapshot` viene rifiutato
**Severità**: 🔴 Critico  
**File**: `src/context/PlannerAuthContext.tsx`

**Causa radice**: `setIsLoading(false)` era chiamato solo nel success callback; un `permission-denied` silenzioso lasciava `isLoading=true` per sempre.

**Diff applicata**:
```diff
  plannerUnsub = onSnapshot(
    uidDocRef,
    async (uidSnap) => { ... setIsLoading(false); },
+   (err) => {
+     if (myReq !== requestId) return;
+     clearSafety();
+     console.error('[PlannerAuth] onSnapshot error', err);
+     setAuthError('Errore di connessione. Riprova più tardi.');
+     setIsLoading(false);
+   }
  );
+ safetyTimer = setTimeout(() => { if (myReq !== requestId) return; setIsLoading(false); }, 6000);
```

**Rischio regressione**: Basso.  
**Test manuali**:
1. Slow 3G → login → spinner visibile.
2. Spegni rete durante login → dopo max 6s lo spinner si ferma con messaggio errore.

---

### BUG-05 — updateDoc lastLogin su `/admins` sempre rifiutato
**Severità**: 🔴 Critico  
**File**: `src/context/PlannerAuthContext.tsx:75`

**Causa radice**: `updateDoc(doc(db,'admins',uid), {lastLogin: serverTimestamp()})` fallisce sempre perché le rules lo bloccano, generando un errore silenzioso ad ogni login SuperAdmin.

**Diff applicata**:
```diff
- if (admin) {
-   updateDoc(doc(db, 'admins', firebaseUser.uid), { lastLogin: serverTimestamp() }).catch(console.error);
- }
+ // BUG-05 fix: rimosso — la server action updatePlannerLastLogin usa Admin SDK
```

**Rischio regressione**: Basso — la server action `updatePlannerLastLogin` rimane l'unico percorso valido.

---

### BUG-06 — XB UI permette creare eventi ma rules bloccano
**Severità**: 🔴 Critico  
**File**: `firestore.rules`, match `/plannerEvents`

**Causa radice**: `allow create: if isOwner(...plannerId) || canEdit('projects')` — `canEdit('projects')` richiede il campo `permissions.projects='editor'` nell'`admins` doc, che i planner XB non hanno.

**Diff applicata**:
```diff
  match /plannerEvents/{eventId} {
-   allow read:   if isOwner(resource.data.plannerId) || canView('projects');
-   allow create: if isOwner(request.resource.data.plannerId) || canEdit('projects');
+   allow read:   if isOwner(resource.data.plannerId) || canView('projects') || hasTeam('TeQF');
+   allow create: if isOwner(request.resource.data.plannerId) || canEdit('projects')
+     || (isOwner(request.resource.data.plannerId) && hasTeam('XB'));
    allow update, delete: if isOwner(resource.data.plannerId) || canEdit('projects');
  }
```

**Rischio regressione**: Medio — testare che XB non possa leggere eventi di altri XB.  
**Test manuali**:
1. Login come Xanath (XB) → crea un evento → deve salvare senza errori.
2. Login come altro XB → verifica che non veda eventi di Xanath (query filtra su `plannerId==uid`).
3. Login come Nancy (TeQF) → verifica che veda tutti gli eventi in `/planner/events`.

---

### BUG-07 — 4 AuthContext con onAuthStateChanged in parallelo
**Severità**: 🟠 Alto  
**File**: `AdminAuthContext.tsx`, `CashControlAuthContext.tsx`  
**Stato**: ⏳ Rinviato — commento `BUG-07` aggiunto in cima ai due file.

**Causa radice**: 4 listener Firebase Auth aperti in contemporanea → 4× chiamate Firestore per ogni cambio di stato. Su slow network questo è misurabile.

**Refactor proposto**: `FirebaseUserProvider` a root con un unico `onAuthStateChanged`. Vedi AUDIT_REPORT.md sezione "Refactor Proposti".

---

### BUG-08 — Flash di contenuto protetto in layout
**Severità**: 🟠 Alto  
**File**: `src/app/planner/layout.tsx`

**Causa radice**: il redirect avviene in `useEffect` che è asincrono; nel frame tra il render e l'esecuzione dell'effect, i figli vengono montati e brevemente visibili.

**Diff applicata**:
```diff
+ const PUBLIC_ROUTES = ['/planner/login', '/planner/register'];
+ const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
+ const hasAccess = !!plannerUser || isSuperAdmin;
+ const redirectPending = (!hasAccess && !isPublicRoute) || (hasAccess && isPublicRoute) || ...;
+ if (redirectPending) return <spinner />;
  return <>{children}</>;
```

**Rischio regressione**: Basso — lo spinner è identico a quello di `isLoading`.

---

### BUG-09 — 12 pagine con `return null` → schermo bianco
**Severità**: 🟠 Alto  
**File coinvolti** (con riga originale):

| File | Riga | Tipo fix |
|---|---|---|
| `cash-control-users/page.tsx` | 34 | `return <AccessDenied />` |
| `flowers/page.tsx` | 321 | `!adminUser && !canManageCatalogs → <AccessDenied />` |
| `flowers/[id]/page.tsx` | 141 | `!adminUser && !canManageCatalogs → <AccessDenied />` |
| `furniture/page.tsx` | 761 | `!adminUser && !canManageCatalogs → <AccessDenied />` |
| `furniture/[id]/page.tsx` | 340 | `!adminUser && !canManageCatalogs → <AccessDenied />` |
| `blog/page.tsx` | 65 | `return <AccessDenied />` |
| `blog/[id]/page.tsx` | 196 | `return <AccessDenied />` |
| `planners/page.tsx` | 108 | `return <AccessDenied />` |
| `planners/events/[id]/page.tsx` | 62 | `return <AccessDenied />` |
| `portfolio/page.tsx` | 47 | `return <AccessDenied />` |
| `portfolio/[id]/page.tsx` | 178 | `return <AccessDenied />` |
| `page.tsx` (SuperAdminDashboard) | 181 | `return <AccessDenied />` |

**Causa radice**: pattern legacy che assumeva che il layout impedisse sempre l'accesso senza admin.

**Rischio regressione**: Basso — mostrare un messaggio di errore è sempre meglio dello schermo bianco.

---

### BUG-10 — plannerEvents listener scarica TUTTI gli eventi per XB
**Severità**: 🟠 Alto  
**File**: `src/app/planner/events/page.tsx`

**Causa radice**: query globale senza filtro `plannerId` — un utente XB scaricava tutti gli eventi di tutti i planner.

**Diff applicata** (estratto):
```diff
+ const viewAll = isSuperAdmin || canManageCashControl;
+ const eventsQuery = viewAll
+   ? query(collection(db, 'plannerEvents'), orderBy('createdAt', 'desc'))
+   : uid
+     ? query(collection(db, 'plannerEvents'), where('plannerId', '==', uid), orderBy(...))
+     : null;
```

**Rischio regressione**: Medio — verificare con Network tab che la query XB abbia `plannerId==uid`.  
**Test manuali**:
1. Login come Xanath (XB) → Network tab → singola query Firestore con `where plannerId == <xanath_uid>`.
2. Login come Nancy (TeQF) → query globale (nessun filtro plannerId).

---

### BUG-11 — `hasTeam()` esplode su user senza doc planner
**Severità**: 🟠 Alto  
**File**: `firestore.rules`

**Causa radice**: `plannerData().team` → `get()` su doc inesistente restituisce un errore in Firestore Security Rules.

**Diff applicata**:
```diff
- function plannerData() {
-   return get(/databases/$(database)/documents/planners/$(request.auth.uid)).data;
- }
- function hasTeam(teamName) {
-   return isAuth() && exists(...) && teamName in plannerData().team;
- }
+ function plannerTeams() {
+   return exists(...)
+     ? get(...).data.get('team', [])
+     : [];
+ }
+ function hasTeam(teamName) { return isAuth() && teamName in plannerTeams(); }
```

**Rischio regressione**: Basso — solo users con doc planner assente erano affetti.

---

### BUG-12 — Letture sequenziali in PlannerAuthContext
**Severità**: 🟡 Medio  
**File**: `src/context/PlannerAuthContext.tsx`

**Causa radice**: `await getDoc(admins)` bloccava il thread prima di avviare `updatePlannerLastLogin`, aggiungendo latenza ad ogni login.

**Diff applicata**:
```diff
+ const adminPromise = getDoc(doc(db, 'admins', firebaseUser.uid));
+ const lastLoginPromise = firebaseUser.email ? updatePlannerLastLogin(...).catch(console.error) : Promise.resolve();
  const adminSnap = await adminPromise;
+ void lastLoginPromise;  // fire-and-forget, non blocca il render
```

**Rischio regressione**: Basso.

---

### BUG-13 — `getPlannerEvents` usa auto-id invece di uid
**Severità**: 🟡 Medio  
**File**: `src/app/planner/page.tsx`

**Causa radice**: `plannerUser.id` è l'auto-ID del documento Firestore; `plannerId` nell'evento è il Firebase Auth UID.

**Diff applicata**:
```diff
- getPlannerEvents(plannerUser.id)
+ const uid = auth.currentUser?.uid ?? plannerUser.id;
+ getPlannerEvents(uid)
```

**Rischio regressione**: Basso — per users con doc uid-keyed (post-2026-05) risolve; per legacy il fallback al `plannerUser.id` mantiene il comportamento precedente.

---

### BUG-14 — Tile "Gestione Utenti" punta a `/admin/users` (cross-layout)
**Severità**: 🟡 Medio  
**File**: `src/app/planner/page.tsx`  
**Stato**: Commento in-code aggiunto. La rotta `/planner/users` non esiste — il link non è stato cambiato.

```diff
  href: '/admin/users',
+ // BUG-14 note: cross-layout link, da spostare quando esisterà /planner/users
```

---

### BUG-15 — Save furniture in 2 round-trip può lasciare doc orfano
**Severità**: 🟡 Medio  
**File**: `src/app/planner/furniture/page.tsx`, `saveStandbyItem`

**Causa radice**: `saveFurnitureItem(images:[])` creava il doc, poi `updateFurnitureImages` falliva → doc senza immagine in DB.

**Diff applicata**:
```diff
  const result = await saveFurnitureItem({
-   ..., images: [],
+   ..., images: [s.imageUrl],  // BUG-15 fix
  });
- if (result.success && result.id) {
-   await updateFurnitureImages(result.id, [s.imageUrl]);
+ if (result.success && result.id) {
    // immagine già inclusa nel primo write
```

**Rischio regressione**: Basso — la server action `saveFurnitureItem` accetta già il campo `images`.

---

### BUG-16 — setTimeout senza cleanup → warning React su unmount
**Severità**: 🟡 Medio  
**File**: `src/app/planner/furniture/page.tsx`

**Causa radice**: `setTimeout(() => setUploads(...), 2000)` non veniva cancellato su unmount.

**Diff applicata**:
```diff
+ const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
+ useEffect(() => () => { pendingTimeoutsRef.current.forEach(clearTimeout); }, []);
  ...
- setTimeout(() => setUploads(...), 2000);
+ const tid = setTimeout(() => setUploads(...), 2000);
+ pendingTimeoutsRef.current.push(tid);
```

**Rischio regressione**: Nessuno.

---

### BUG-QW — `console.log` in AuthContext
**Severità**: 🟢 Quick win  
**File**: `src/context/AuthContext.tsx:35`

```diff
- console.log(error);
+ console.error('[AuthContext] auth state change failed', error);
```
