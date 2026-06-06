# Cash Control Changes — PART-3

Changes applied to `/planner/cash-control` (TeQF Projects cash-control system).

## Files modified

| File | Change |
|------|--------|
| `src/lib/format.ts` | NEW — `formatCurrency()` helper, MXN via `Intl.NumberFormat('es-MX', { currency: 'MXN' })` |
| `src/hooks/useT.ts` | NEW — `useT()` hook, reads/writes `localStorage('teqf.lang')` |
| `src/locales/cash-control/it.json` | NEW — Italian translation dictionary |
| `src/locales/cash-control/es.json` | NEW — Spanish translation dictionary |
| `src/lib/teqf-types.ts` | Added `paymentMethod`, `tags`, `photoUrls`, `uploadStatus` to `TeqfCashMovement`; added `isClosed`, `closedAt`, `closedBy` to `TeqfProject` |
| `src/actions/planner/teqf-projects.ts` | Updated `addTeqfCashMovement` / `updateTeqfCashMovement` to accept new fields; added `patchTeqfMovementPhotoUrls` |
| `src/app/api/cash-control/teqf-close/route.ts` | NEW — POST endpoint: marks project `isClosed=true` in Firestore, sends email to `admin@tequierofeliz.mx` via Resend |
| `src/app/planner/cash-control/[projectId]/page.tsx` | Full rewrite — all 7 changes (see below) |
| `src/app/planner/cash-control/page.tsx` | Language switch button + localized date formatting |
| `storage.rules` | Added `cashControl/{userId}/**` rule: authenticated owner, max 5 MB, `image/*` only |

## Changes detail

### 1. Currency EUR → MXN
- Removed `fmtCurrency(n) = €${n.toLocaleString('it-IT'...)}`
- Now uses `formatCurrency(n)` from `src/lib/format.ts` — outputs e.g. `MXN 1,234.50`
- Applied to stats bar and every movement row

### 2. IT/ES language switch
- `useT({ it: IT, es: ES })` reads initial value from `localStorage('teqf.lang')`, defaults to `'es'`
- Toggle button in header shows current opposite language (`ES` when Italian is active, `IT` when Spanish is active)
- Both the list page and detail page sync to the same key
- Date formatting uses `date-fns/locale` (`es` or `it`)

### 3. Entrate → payment method selector
- For **new income movements**, the modal now shows a step 1: "Efectivo" / "Transferencia" buttons before the full form
- Expense movements skip step 1 and go directly to the form
- Selected payment method is saved as `paymentMethod` field on the movement
- Badge shown in the movement list row (income only)

### 4. Dynamic tags FIFO cap 8
- Free-text input + Enter/comma to add tag (lowercase, max 24 chars)
- 8 predefined quick-tags: flores, ferreteria, comida, uber, taxi, materiales, propina, urgente
- When a 9th tag is added, the oldest (index 0) is automatically removed (FIFO)
- Tags shown as removable chips in the form and as read-only chips in the list
- Hint shows `N/8` count

### 5. Camera photo upload
- Camera/gallery button (`accept="image/*" capture="environment"`) in the form
- Max 5 photos per movement
- Thumbnails shown with ✕ remove button; object URLs cleaned up on unmount
- Save is non-blocking: movement is written with `uploadStatus: 'pending'`, photos upload in background
- After upload completes, `patchTeqfMovementPhotoUrls` sets `photoUrls` + `uploadStatus: 'uploaded'`
- Photos stored at `cashControl/{uid}/{projectId}/{movementId}/{timestamp_name}`
- Images compressed via existing `src/lib/cash-control/compressImage.ts` before upload
- Upload progress bar shown while uploading

### 6. Cerrar cuenta
- Sticky "Cerrar cuenta" button at the bottom of the detail page (hidden when already closed)
- Confirmation sheet shows balance summary (total received, spent, saldo)
- On confirm: calls `POST /api/cash-control/teqf-close` with auth token
  - Marks `teqfProjects/{id}` with `isClosed: true`, `closedAt`, `closedBy`
  - Sends email to `admin@tequierofeliz.mx` with movement detail table (Resend, `RESEND_API_KEY` env var)
  - Email failure is non-fatal — project is closed regardless
- After close: list becomes read-only, edit/delete buttons hidden, "Cerrar cuenta" button hidden
- Closed banner shows in UI

### 7. Calendar restyling
- Date input replaced with `<Popover> + <Calendar>` (shadcn `react-day-picker`)
- Localized: `weekStartsOn={1}` (Monday), locale from `date-fns/locale` based on current language
- CSS custom properties injected: `--primary: var(--tqf-bordeaux)`, `--accent: var(--tqf-cipria-light)`, `--muted: var(--tqf-beige)`
- Date displayed using `date-fns format()` with correct locale

## Storage rules

```
match /cashControl/{userId}/{allPaths=**} {
  allow read:   if request.auth != null;
  allow write:  if request.auth != null
    && request.auth.uid == userId
    && request.resource.size <= 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
  allow delete: if request.auth != null
    && request.auth.uid == userId;
}
```

## Manual test checklist

- [ ] Open `/planner/cash-control` → language toggle button visible in header → click switches IT↔ES
- [ ] Date format on project cards changes language (e.g. "5 jun 2026" vs "5 giu 2026")
- [ ] Click project → detail page → header shows correct translations
- [ ] Click "Agregar" → step 1 shows Entrata / Gasto selector
  - [ ] Entrata: shows Efectivo / Transferencia method selector
  - [ ] Select Efectivo → advances to full form with Efectivo pre-selected
  - [ ] Gasto: shows "Siguiente" button → advances to full form
- [ ] In full form: currency input shows MXN in stats
- [ ] Add tags: type a tag + Enter → appears as chip
  - [ ] Clicking predefined quick-tags adds them
  - [ ] Adding 9th tag removes the 1st (FIFO)
  - [ ] Duplicate tags are ignored
  - [ ] Tags > 24 chars shows error toast
- [ ] Calendar: click date button → popover with styled calendar opens → select date
  - [ ] Calendar uses site colors (bordeaux selected, beige background)
  - [ ] Week starts Monday
- [ ] Add photo: click camera icon → file picker opens → thumbnail appears
  - [ ] Max 5 photos enforced
  - [ ] Click ✕ removes thumbnail
  - [ ] Save movement → progress bar visible → photo uploads to Firebase Storage
  - [ ] Movement shows 📷N indicator after upload
- [ ] Stats bar shows MXN amounts (e.g. "MXN 500.00")
- [ ] Tags shown as chips on movement rows
- [ ] "Cerrar cuenta" button visible at bottom (sticky)
  - [ ] Click → confirmation sheet with balance summary
  - [ ] Confirm → project marked closed, email sent to admin@tequierofeliz.mx
  - [ ] After close: edit/delete buttons gone, "Cerrar cuenta" gone, closed banner shown
- [ ] Closed project in list page: can still open and view movements
- [ ] `npm run build` passes with no errors
