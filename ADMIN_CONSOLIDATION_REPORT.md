# Admin Area Consolidation Report

## Summary

The repository currently contains two separate administrative surfaces:

- `/admin`: a classic internal admin portal with its own admin auth flow (`AdminAuthContext`) and dedicated login/change-password/seed pages.
- `/admin-dashboard`: a general admin dashboard integrated with the main user auth flow (`AuthContext`) and protected by the global authorization provider.

This duplication increases maintenance cost, creates user confusion, and splits access control logic.

---

## Route Inventory

### `/admin`

Files present under `src/app/admin`:

- `page.tsx`
- `layout.tsx`
- `login/page.tsx`
- `change-password/page.tsx`
- `seed/page.tsx`
- `blog/page.tsx`
- `blog/[id]/page.tsx`
- `cash-control/users/page.tsx`
- `events/page.tsx`
- `events/[id]/page.tsx`
- `flowers/page.tsx`
- `flowers/[id]/page.tsx`
- `furniture/page.tsx`
- `furniture/[id]/page.tsx`
- `planners/page.tsx`
- `planners/events/[id]/page.tsx`
- `portfolio/page.tsx`
- `portfolio/[id]/page.tsx`
- `users/page.tsx`

### `/admin-dashboard`

Files present under `src/app/admin-dashboard`:

- `page.tsx`
- `layout.tsx`
- `category/page.tsx`
- `location/page.tsx`
- `products/page.tsx`
- `users-products/page.tsx`
- `users/page.tsx`
- `users/loading.tsx`
- `client-event/page.tsx`
- `client-event/[id]/page.tsx`
- `client-event/[id]/loading.tsx`
- `events/page.tsx`
- `events/[id]/page.tsx`
- `events/[id]/loading.tsx`

---

## Overlap and Functional Separation

### Functional overlap

- `events` is present in both `/admin/events` and `/admin-dashboard/events`.
- `users` is present in both `/admin/users` and `/admin-dashboard/users`.

These appear to be the main duplicated domains.

### Unique to `/admin`

- Blog management (`blog`)
- Portfolio management (`portfolio`)
- Planner management (`planners`)
- Cash control user management (`cash-control/users`)
- Furniture catalog (`furniture`)
- Flower catalog (`flowers`)
- Admin auth and onboarding (`login`, `change-password`, `seed`)

### Unique to `/admin-dashboard`

- Category management (`category`)
- Product management (`products`)
- User product management (`users-products`)
- Location/city management (`location`)
- Client event detail routes (`client-event`)

---

## Auth / Layout Comparison

### `/admin`

- Uses `src/app/admin/layout.tsx`.
- Wraps pages with `AdminAuthContextProvider`.
- Enforces auth via `AdminGuard` inside the layout.
- Provides its own login page at `/admin/login` and password flow at `/admin/change-password`.
- This is an isolated admin portal with dedicated guard logic.

### `/admin-dashboard`

- Uses `src/app/admin-dashboard/layout.tsx`.
- Renders `AdminSidebar` and no dedicated auth wrapper in its own layout.
- Relies on the main app auth context and authorization rules defined in `src/lib/AuthorizationProvider.tsx`.
- `AuthorizationProvider` is globally included via `src/app/layout.tsx`.

### Key auth distinction

`src/lib/AuthorizationProvider.tsx` currently treats any pathname starting with `/admin` as always allowed in `isAlwaysAllowed()`.

That means:

- `/admin` routes are effectively bypassed by the root authorization policy and rely solely on `AdminGuard` for protection.
- `/admin-dashboard` is protected by the main auth flow and requires a logged-in `admin` or `manager` role.

This is the most important architectural difference between the two surfaces.

---

## Internal References and Access Points

### `/admin` references

- `src/app/area-planner/cash-control/admin/page.tsx` links to `/admin` and `/admin/cash-control/users`.
- `src/app/planner/accesso-admin/page.tsx` links to `/admin`.
- Many `/admin/*` subpages link internally back to `/admin`.

### `/admin-dashboard` references

- `src/components/auth/AuthButtons.tsx` links admin users to `/admin-dashboard`.
- `src/components/admin/AdminSidebar.tsx` defines the sidebar nav for `/admin-dashboard`.
- Action files like `src/actions/category/category-crud.ts`, `src/actions/product/addProduct.ts`, `src/actions/product/editProduct.ts`, and `src/actions/location/location-crud.ts` revalidate `/admin-dashboard/*` paths.
- There is a commented-out reference to `/admin-dashboard` in `src/lib/AuthorizationProvider.tsx`.

### Shared or cross-surface references

- No strong automated link between `/admin` and `/admin-dashboard` appears in current code, except for individual cross-links from planner routes and page-level navigation.
- This implies they are currently operating as separate products rather than as one unified admin experience.

---

## Git History Insights

Recent commits affecting both admin areas include:

- `b357e2a Add close and delete actions to planner event detail page (superadmin)`
- `f12451a Fix superadmin dashboard: show all sections with full admin access`
- `f25674f Add admin events panel, multi-day planner, eventStartTime, cash control admin card`
- `a8d9112 feat: superadmin cash control panel, detailed closure email, multi-event per day, event start time`
- `3ef9bf5 Add cash control module and update pages for tequierofeliz.mx deploy`
- `db05563 Deploy: redesign v2, admin system, password protection`

These messages suggest: `/admin` and `/admin-dashboard` evolved through multiple feature commits and likely represent different phases of admin-system development.

---

## Recommendation

Given the current structure, the cleanest path is to consolidate into one canonical admin surface and keep the other as a transition compatibility layer while migrating.

### Option A: Canonicalize `/admin-dashboard` as the single admin surface

- Keep `/admin-dashboard` as the main admin portal because it is integrated into the public auth flow and already has a sidebar navigation for admin roles.
- Migrate `/admin` pages into `/admin-dashboard` where possible.
- Preserve `/admin/login`, `/admin/change-password`, and `/admin/seed` only if there is a strict need for a separate internal admin login; otherwise, retire them.
- Refactor `src/lib/AuthorizationProvider.tsx` so `/admin-dashboard` is the canonical admin area and `/admin` routes are not bypassed unexpectedly.

### Option B: Canonicalize `/admin` as the superadmin portal and rename `/admin-dashboard` routes

- Keep `/admin` as the core internal portal with explicit `AdminAuthContext` and dedicated guards.
- Move `/admin-dashboard` functionality into `/admin` with a clear structure like `/admin/products`, `/admin/category`, `/admin/location`, `/admin/users-products`.
- This is heavier but keeps admin auth consistent in one place.

### More pragmatic short-term plan

1. Create an inventory mapping of current `/admin` and `/admin-dashboard` pages to target routes.
2. Decide on a single route prefix: either `/admin` or `/admin-dashboard`.
3. Migrate shared components/layouts:
   - Consolidate sidebar/menu components.
   - Align auth logic around one provider.
4. Keep old routes as redirects during transition.
5. Remove duplicate feature implementations once the single surface is verified.

---

## Suggested Consolidation Execution Plan

1. Choose canonical root prefix:
   - Prefer `/admin-dashboard` if you want to preserve the existing user-auth integrated flow.
   - Prefer `/admin` if you want a dedicated internal admin portal with explicit admin-only guard.
2. Merge shared features first:
   - `events`
   - `users`
3. Migrate unique feature sets next:
   - `/admin`-only catalog tools (`blog`, `portfolio`, `planners`, `furniture`, `flowers`, `cash-control`)
   - `/admin-dashboard`-only commerce tools (`category`, `products`, `location`, `users-products`, `client-event`)
4. Rewrite auth / redirect logic:
   - Remove `isAlwaysAllowed(pathname.startsWith('/admin'))` from `AuthorizationProvider.tsx`.
   - Ensure `/admin-dashboard` protection is stable for admin/manager roles.
   - If keeping `/admin`, retain `AdminAuthContext` guard but make `/admin` routes subject to the same global auth guard or else clearly segregate them as a legacy admin portal.
5. Update all internal links in `AuthButtons.tsx`, planner flows, and other pages to point to the chosen canonical admin prefix.

---

## Conclusion

The repo currently has two active admin surfaces with partial overlap and different auth models. The highest-impact consolidation is to choose a single canonical admin prefix and unify the auth/layout strategy around it. `/admin-dashboard` is the stronger candidate for a modern, authenticated admin experience, but `/admin` may remain useful as a separate internal superadmin portal if you need a distinct login flow.

If you want, I can next produce a concrete migration plan with exact route mappings and code-level refactor steps.
