# Admin Refactor Plan

---

## 1. Schema DB

### 1.1 DDL enum `app_role`

`CREATE TYPE IF NOT EXISTS` non esiste in PostgreSQL standard e fa fallire la migration.
Usare il pattern idempotente:

```sql
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'superadmin',
    'admin',
    'manager',
    'planner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### 1.2 DDL tabella `user_roles`

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
```

### 1.3 DDL funzione `has_role`

```sql
CREATE OR REPLACE FUNCTION public.has_role(target_user_id uuid, target_role app_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = target_role
  );
$$;

ALTER FUNCTION public.has_role(uuid, app_role)
OWNER TO postgres;
```

### 1.4 RLS policies per `user_roles`

```sql
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Solo superadmin può scrivere / modificare / cancellare ruoli
CREATE POLICY "superadmin can modify user_roles"
  ON public.user_roles
  FOR ALL
  TO public
  USING (
    public.has_role(auth.uid()::uuid, 'superadmin')
  )
  WITH CHECK (
    public.has_role(auth.uid()::uuid, 'superadmin')
  );

-- Qualsiasi utente vede solo i propri ruoli
CREATE POLICY "users can select own roles"
  ON public.user_roles
  FOR SELECT
  TO public
  USING (
    user_id = auth.uid()::uuid
    OR public.has_role(auth.uid()::uuid, 'superadmin')
  );

-- Disabilita accesso anonimo se non autorizzato
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
```

> Nota: `has_role` è `SECURITY DEFINER`, quindi bypassa le RLS quando eseguita dalla funzione stessa — nessuna ricorsione infinita.

### 1.5 Migration SQL completa da applicare

**ATTENZIONE**: senza il bootstrap superadmin nessuno potrà accedere all'area admin dopo il deploy. Lo step INSERT va eseguito obbligatoriamente prima di qualsiasi test.

```sql
BEGIN;

-- 1. Enum (idempotente su PostgreSQL)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'superadmin',
    'admin',
    'manager',
    'planner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabella user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Funzione has_role
CREATE OR REPLACE FUNCTION public.has_role(target_user_id uuid, target_role app_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = target_role
  );
$$;

ALTER FUNCTION public.has_role(uuid, app_role) OWNER TO postgres;

-- 4. RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin can modify user_roles"
  ON public.user_roles FOR ALL TO public
  USING (public.has_role(auth.uid()::uuid, 'superadmin'))
  WITH CHECK (public.has_role(auth.uid()::uuid, 'superadmin'));

CREATE POLICY "users can select own roles"
  ON public.user_roles FOR SELECT TO public
  USING (
    user_id = auth.uid()::uuid
    OR public.has_role(auth.uid()::uuid, 'superadmin')
  );

ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- 5. Bootstrap primo superadmin
-- Sostituire SUPERADMIN_EMAIL con l'email dell'account auth principale
-- (fornire l'email prima di eseguire questa migration)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::app_role
FROM auth.users
WHERE email = 'SUPERADMIN_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
```

> **Senza questo INSERT il deploy risulta in un'area admin inaccessibile a chiunque.**
> Fornire l'email del tuo account Supabase Auth principale prima di eseguire.

### 1.6 Migrazione admin esistenti da Firebase a Supabase

**Contesto**: il vecchio sistema riconosce gli admin tramite `AdminAuthContext.tsx` che cerca l'utente nella collezione Firestore `admins` (campo `email`, `active: true`). Si tratta di Firebase Auth + Firestore — sistema completamente separato da Supabase.

**Problema**: i UUID Firebase e i UUID Supabase sono diversi. Non è possibile un join diretto. La migrazione richiede due passi.

#### Passo A — Estrarre le email admin da Firebase

Eseguire questo script Node.js una volta sola per ottenere la lista delle email admin attive:

```ts
// scripts/export-firebase-admins.ts
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ credential: ... });
const db = getFirestore(app);

const snapshot = await db.collection('admins')
  .where('active', '==', true)
  .get();

const emails = snapshot.docs.map(d => d.data().email as string);
console.log(JSON.stringify(emails, null, 2));
```

#### Passo B — SQL di migrazione con le email estratte

Sostituire la lista email con quelle ottenute dal passo A:

```sql
-- Migrazione admin esistenti da Firebase → Supabase user_roles
-- Eseguire DOPO la migration 1.5 e DOPO che gli utenti si sono registrati su Supabase Auth

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN (
  'admin1@tequierofeliz.com',
  'admin2@tequierofeliz.com'
  -- aggiungere tutte le email estratte dallo script passo A
)
ON CONFLICT (user_id, role) DO NOTHING;
```

> **Nota**: questo INSERT inserisce solo gli utenti che si sono già registrati su Supabase Auth con la stessa email. Chi non ha ancora un account Supabase non apparirà nel risultato — dovrà prima registrarsi o essere invitato tramite Supabase Auth.

---

## 2. Mappa migrazione route

| Vecchio path | Nuovo path | Azione file | Note |
|---|---|---|---|
| `/admin-dashboard` | `/admin` | non creare, usare `src/app/admin/page.tsx` | root alias redirect 308 |
| `/admin-dashboard/category` | `/admin/category` | spostare `src/app/admin-dashboard/category/page.tsx` → `src/app/admin/category/page.tsx` | nuova sezione Catalogo |
| `/admin-dashboard/location` | `/admin/location` | spostare `src/app/admin-dashboard/location/page.tsx` → `src/app/admin/location/page.tsx` | nuova sezione Sistema |
| `/admin-dashboard/products` | `/admin/products` | spostare `src/app/admin-dashboard/products/page.tsx` → `src/app/admin/products/page.tsx` | nuova sezione Catalogo |
| `/admin-dashboard/users-products` | `/admin/users-products` | spostare `src/app/admin-dashboard/users-products/page.tsx` → `src/app/admin/users-products/page.tsx` | nuova sezione Utenti |
| `/admin-dashboard/users` | `/admin/users` | mantenere `src/app/admin/users/page.tsx`, migrare eventuali feature da `src/app/admin-dashboard/users/page.tsx` | duplicato: mantiene `/admin` canonico |
| `/admin-dashboard/client-event` | `/admin/client-event` | spostare `src/app/admin-dashboard/client-event/page.tsx` → `src/app/admin/client-event/page.tsx` | crea route parallela in `/admin` |
| `/admin-dashboard/client-event/[id]` | `/admin/client-event/[id]` | spostare `src/app/admin-dashboard/client-event/[id]/page.tsx` → `src/app/admin/client-event/[id]/page.tsx` | |
| `/admin-dashboard/events` | `/admin/events` | mantenere `src/app/admin/events/page.tsx`, portare qui le funzionalità admin-dashboard se mancanti | duplicato: canonical path `/admin/events` |
| `/admin-dashboard/events/[id]` | `/admin/events/[id]` | mantenere `src/app/admin/events/[id]/page.tsx`, integrare feature detailed view | duplicato: canonical path |

### Decisione sui duplicati

- `events`: mantenere `/admin/events` perché `/admin` è il root canonico e ha già il layout admin unificato.
- `users`: mantenere `/admin/users` per la stessa ragione.

---

## 3. Mappa link interni da aggiornare

- `src/actions/category/category-crud.ts` linee 34, 54, 66: `revalidatePath('/admin-dashboard/category')`
- `src/actions/location/location-crud.ts` linee 34, 54, 66: `revalidatePath('/admin-dashboard/location')`
- `src/actions/product/addProduct.ts` linea 22: `revalidatePath('/admin-dashboard/products')`
- `src/actions/product/deleteProduct.ts` linea 16: `revalidatePath('/admin-dashboard/products')`
- `src/actions/product/editProduct.ts` linee 27, 87, 88: `revalidatePath('/admin-dashboard/products')` e `/admin-dashboard/users-products`
- `src/actions/user/deleteUser.ts` linea 14: `revalidatePath('/admin-dashboard/users')`
- `src/actions/user/updateUser.ts` linea 16: `revalidatePath('/admin-dashboard/users')`
- `src/components/admin/AdminSidebar.tsx` linee 16-21: tutti gli href `/admin-dashboard/*`
- `src/components/auth/AuthButtons.tsx` linea 52: `href={isAdmin ? '/admin-dashboard' : '/user-dashboard'}`
- `src/components/user/event/EventTable.tsx` linea 100: template string verso `/admin-dashboard/${...}`

---

## 4. File da cancellare

- `src/app/admin/login/page.tsx`
- `src/app/admin/change-password/page.tsx`
- `src/context/AdminAuthContext.tsx`
- `src/app/admin/layout.tsx` — riscrivere senza `AdminGuard` e senza `AdminAuthContextProvider`
- `src/app/admin-dashboard/` intera cartella DOPO la migrazione
- `src/app/admin/seed/page.tsx` se dead code

---

## 5. Modifiche `AuthorizationProvider.tsx` — codice effettivo

### 5.1 Hook `useAdminRoles` con Supabase + caching

Il check ruolo viene fatto una volta sola e cachato in context per evitare query ad ogni render.

```tsx
// src/hooks/useAdminRoles.ts
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export type AppRole = 'superadmin' | 'admin' | 'manager' | 'planner';

export function useAdminRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.error('[useAdminRoles]', error.message);
          setRoles([]);
        } else {
          setRoles((data ?? []).map(r => r.role as AppRole));
        }
        setLoading(false);
      });
  }, [userId]);

  return { roles, loading };
}
```

### 5.2 Short-circuit superadmin in AuthorizationProvider

```tsx
// src/lib/AuthorizationProvider.tsx — versione aggiornata (estratto rilevante)
'use client';
import { useAdminRoles } from '@/hooks/useAdminRoles';

function AuthorizationProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuthContext();
  const { roles, loading: rolesLoading } = useAdminRoles(currentUser?.id);
  const pathname = usePathname();
  const router = useRouter();

  const isSuperAdmin = roles?.includes('superadmin') ?? false;
  const isAdmin = isSuperAdmin || (roles?.includes('admin') ?? false);

  // Rimuovere il bypass generico di /admin da isAlwaysAllowed:
  // pathname.startsWith('/admin') NON deve più essere in questa lista
  const isAlwaysAllowed = (p: string) =>
    ROUTES.PUBLIC.includes(p) ||
    ROUTES.AUTH.some(r => p.startsWith(r)) ||
    p.startsWith('/blog') ||
    p.startsWith('/portfolio') ||
    p.startsWith('/planner') ||
    p.startsWith('/area-planner') ||
    p.startsWith('/flowers') ||
    p.startsWith('/catalog');

  useEffect(() => {
    if (isAlwaysAllowed(pathname)) { setIsAuthorized(true); return; }
    if (isLoading || rolesLoading) return;

    // Superadmin bypassa tutto
    if (isSuperAdmin) { setIsAuthorized(true); return; }

    // Accesso /admin richiede almeno admin o superadmin
    if (pathname.startsWith('/admin')) {
      if (isAdmin) {
        setIsAuthorized(true);
      } else {
        router.replace('/login');
      }
      return;
    }

    // ... resto della logica esistente per /user-dashboard, /status, ecc.
  }, [currentUser, isLoading, rolesLoading, roles, pathname, router]);
}
```

### 5.3 AdminSidebar con voci per ruolo

```tsx
// src/components/admin/AdminSidebar.tsx — estratto
'use client';
import { useAdminRoles } from '@/hooks/useAdminRoles';

export function AdminSidebar({ userId }: { userId: string }) {
  const { roles } = useAdminRoles(userId);

  const isSuperAdmin = roles?.includes('superadmin') ?? false;
  const isAdmin = isSuperAdmin || (roles?.includes('admin') ?? false);

  return (
    <nav>
      {/* Visibile a tutti gli admin */}
      <SidebarGroup label="Eventi">
        <SidebarItem href="/admin/events" label="Eventi" />
        <SidebarItem href="/admin/client-event" label="Eventi cliente" />
      </SidebarGroup>

      <SidebarGroup label="Utenti">
        <SidebarItem href="/admin/users" label="Utenti" />
        {isAdmin && <SidebarItem href="/admin/users-products" label="Prodotti utente" />}
      </SidebarGroup>

      <SidebarGroup label="Catalogo">
        <SidebarItem href="/admin/products" label="Prodotti" />
        <SidebarItem href="/admin/category" label="Categorie" />
      </SidebarGroup>

      {/* Cash control: solo superadmin */}
      {isSuperAdmin && (
        <SidebarGroup label="Sistema">
          <SidebarItem href="/admin/cash-control" label="Cash Control" />
          <SidebarItem href="/admin/location" label="Location" />
        </SidebarGroup>
      )}
    </nav>
  );
}
```

### 5.4 Server action con verifica ruolo

```ts
// src/actions/user/deleteUser.ts — versione aggiornata
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteUser(targetUserId: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  // Verifica che il chiamante abbia almeno ruolo admin
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const allowed = roles?.some(r =>
    r.role === 'admin' || r.role === 'superadmin'
  );

  if (!allowed) throw new Error('Non autorizzato');

  // Prosegui con la cancellazione
  await supabase.from('users').delete().eq('id', targetUserId);
  revalidatePath('/admin/users');
}
```

---

## 6. Layout / Sidebar / Breadcrumb unificati

### 6.1 `src/app/admin/layout.tsx`

- Riscrivere il layout come unico wrapper admin.
- Deve includere: `AdminSidebar`, area `main`, `Header` con nome utente e logout, breadcrumb dinamico.

### 6.2 AdminSidebar unica

- Fusione dei due sidebar esistenti in un solo componente (vedi sezione 5.3).
- Gruppi: Eventi, Utenti, Catalogo, Contenuti, Sistema.
- `cash-control` e `location` visibili solo a `superadmin`.

### 6.3 Breadcrumb component

- Breadcrumb dinamico basato su `usePathname()`:
  - Admin > Eventi > Dettaglio evento
  - Admin > Catalogo > Prodotti

---

## 7. Redirect 308

```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      { source: '/admin-dashboard', destination: '/admin', permanent: true },
      { source: '/admin-dashboard/category', destination: '/admin/category', permanent: true },
      { source: '/admin-dashboard/location', destination: '/admin/location', permanent: true },
      { source: '/admin-dashboard/products', destination: '/admin/products', permanent: true },
      { source: '/admin-dashboard/users-products', destination: '/admin/users-products', permanent: true },
      { source: '/admin-dashboard/users', destination: '/admin/users', permanent: true },
      { source: '/admin-dashboard/client-event/:path*', destination: '/admin/client-event/:path*', permanent: true },
      { source: '/admin-dashboard/events/:path*', destination: '/admin/events/:path*', permanent: true },
    ];
  },
};
```

---

## 8. Piano test manuale

### 8.1 Superadmin

1. Login come `superadmin`.
2. Verificare che appaiano tutte le sezioni `AdminSidebar` incluso `cash-control`.
3. Aprire ogni voce e confermare che crea/modifica/cancella funzionino.

### 8.2 Admin

1. Login come `admin`.
2. Controllare che `cash-control` e `location` siano nascoste.
3. Verificare accesso a `events`, `users`, `products`, `category`.

### 8.3 Manager / Planner

1. Login come `manager`.
2. Verificare che `/admin` sia accessibile solo alle pagine permesse.
3. Verificare che azioni non autorizzate vengano bloccate (server action lancia eccezione).

### 8.4 Utente normale

1. Login come `client`.
2. Tentare accesso a `/admin` → deve essere reindirizzato a `/login`.

### 8.5 Redirect 308

1. Aprire `/admin-dashboard` → deve arrivare a `/admin`.
2. Aprire `/admin-dashboard/category` → deve arrivare a `/admin/category`.
3. Ripetere per tutti i path nella mappa redirect.

---

## 9. Ordine commit (corretto)

L'auth refactor DEVE precedere la migrazione file: nei commit intermedi gli admin devono poter entrare nelle pagine già migrate, quindi il sistema auth nuovo deve essere attivo per primo.

1. `feat(admin): DB migration — schema user_roles, has_role, RLS, bootstrap superadmin`
   - Eseguire la migration SQL 1.5 su Supabase.
   - Eseguire lo script export Firebase → SQL migrazione admin esistenti (sezione 1.6).
   - Verificare che il superadmin possa fare login.

2. `refactor(auth): replace AdminAuthContext with Supabase user_roles`
   - Implementare `useAdminRoles` hook.
   - Riscrivere `AuthorizationProvider.tsx` con short-circuit superadmin e check `/admin/*`.
   - Rimuovere `AdminAuthContext.tsx` e `AdminGuard` da `src/app/admin/layout.tsx`.
   - Riscrivere `src/app/admin/layout.tsx` con layout unificato e `AdminSidebar`.

3. `feat(admin): add 308 redirects from /admin-dashboard to /admin`
   - Aggiungere redirect in `next.config.js`.

4. `feat(admin): unified layout, sidebar and breadcrumb`
   - Completare `AdminSidebar` con gruppi e visibilità per ruolo.
   - Aggiungere breadcrumb dinamico.

5. `feat(admin): migrate admin-dashboard pages under /admin`
   - Spostare `category`, `location`, `products`, `users-products`, `client-event`.
   - Aggiornare tutti i `revalidatePath` e i link interni (sezione 3).

6. `feat(admin): merge duplicate events/users functionality`
   - Portare funzionalità di `/admin-dashboard/events` e `/admin-dashboard/users` nelle versioni canoniche `/admin/*`.

7. `chore(admin): remove legacy admin-dashboard directory`
   - Eliminare `src/app/admin-dashboard/` dopo verifica completa.

8. `chore(admin): remove deprecated auth pages and seed`
   - Rimuovere `src/app/admin/login/page.tsx`, `change-password/page.tsx`, `seed/page.tsx`.

---

## Avvertenze

- Il piano presuppone che la pagina login globale e il flusso `AuthContext` siano già funzionanti su Supabase.
- Dopo il commit 1 e prima del commit 5, entrambi gli spazi `admin` e `admin-dashboard` devono restare funzionanti.
- **Prima di iniziare**: fornire l'email dell'account Supabase Auth principale per il bootstrap superadmin nella migration 1.5.
