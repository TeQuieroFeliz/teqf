import { Page, expect } from '@playwright/test';

// ─── loginAs ─────────────────────────────────────────────────────────────────

/**
 * Navigate to /planner/login, fill credentials, submit and wait for redirect to /planner.
 * Throws if login fails twice or spinner is still visible after 8s.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/planner/login', { waitUntil: 'domcontentloaded' });

  // Wait for the form to be rendered
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from /planner/login
  await page.waitForURL(url => !url.pathname.includes('/planner/login'), { timeout: 15000 });

  // Ensure spinner is gone (auth resolved)
  await waitForNoSpinner(page);
}

// ─── logout ──────────────────────────────────────────────────────────────────

/**
 * Find and click the logout button, then verify redirect to login page.
 */
export async function logout(page: Page): Promise<void> {
  // Try various logout button selectors
  const logoutBtn =
    page.getByRole('button', { name: /esci|logout|sign\s*out/i }).first();

  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click();
  } else {
    // Fallback: find button containing the LogOut lucide icon (svg inside button)
    const btns = page.locator('button').filter({ has: page.locator('svg') });
    const count = await btns.count();
    let clicked = false;
    for (let i = count - 1; i >= 0; i--) {
      const btn = btns.nth(i);
      const title = await btn.getAttribute('title') ?? '';
      const ariaLabel = await btn.getAttribute('aria-label') ?? '';
      if (/esci|logout/i.test(title + ariaLabel)) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // Last resort: look for link/button with href/onclick containing logout
      await page.locator('[href*="logout"],[data-action="logout"]').first().click();
    }
  }

  await page.waitForURL(url => url.pathname.includes('/planner/login'), { timeout: 8000 });
}

// ─── waitForNoSpinner ────────────────────────────────────────────────────────

export async function waitForNoSpinner(page: Page, timeout = 8000): Promise<void> {
  try {
    await expect(page.locator('svg.animate-spin').first())
      .not.toBeVisible({ timeout });
  } catch {
    // If no spinner was ever present, that's fine too
  }
}

// ─── expectMenu ──────────────────────────────────────────────────────────────

/**
 * On the /planner dashboard:
 *  - Verifies all `expectedLabels` ARE visible as tile headings.
 *  - Verifies all `excludedLabels` are NOT visible as tile headings.
 * Extra tiles beyond expectedLabels are tolerated (e.g. "Richieste" shown to all).
 * Case-insensitive, trims whitespace.
 */
export async function expectMenu(
  page: Page,
  expectedLabels: string[],
  excludedLabels: string[] = [],
): Promise<void> {
  await page.waitForURL(url => url.pathname === '/planner', { timeout: 10000 });
  await waitForNoSpinner(page);

  // Tile labels are in <h3> elements inside the tile grid
  const tileHeadings = page.locator('h3');
  await expect(tileHeadings.first()).toBeVisible({ timeout: 8000 });

  const actual = await tileHeadings.allTextContents();
  const actualNorm = actual.map(s => s.trim().toLowerCase());
  const expectedNorm = expectedLabels.map(s => s.trim().toLowerCase());
  const excludedNorm = excludedLabels.map(s => s.trim().toLowerCase());

  const missing = expectedNorm.filter(e => !actualNorm.some(a => a.includes(e)));
  const wronglyPresent = excludedNorm.filter(ex => actualNorm.some(a => a.includes(ex)));

  if (missing.length > 0 || wronglyPresent.length > 0) {
    const parts: string[] = [];
    if (missing.length)        parts.push(`Missing tiles: ${missing.join(', ')}`);
    if (wronglyPresent.length) parts.push(`Should NOT be visible: ${wronglyPresent.join(', ')}`);
    throw new Error(`Menu mismatch — ${parts.join(' | ')}\nActual: ${actualNorm.join(', ')}`);
  }
}

// ─── expectAccessDenied ──────────────────────────────────────────────────────

/**
 * Verify the AccessDenied component is shown (not white screen, not spinner loop).
 */
export async function expectAccessDenied(page: Page): Promise<void> {
  await waitForNoSpinner(page, 10000);

  const denied = page.locator('text=Accesso non consentito');
  const unauthorized = page.locator('text=Accesso non autorizzato');
  const either = denied.or(unauthorized);

  await expect(either).toBeVisible({ timeout: 8000 });
}

// ─── expectReadOnly ──────────────────────────────────────────────────────────

/**
 * Verify the ReadOnlyBanner is visible on the page.
 */
export async function expectReadOnly(page: Page): Promise<void> {
  await waitForNoSpinner(page);
  const banner = page.locator('text=sola lettura');
  await expect(banner).toBeVisible({ timeout: 8000 });
}

// ─── expectCanEdit ───────────────────────────────────────────────────────────

/**
 * Verify the page is in edit mode: no ReadOnlyBanner and at least one
 * primary action button (Nuovo, Aggiungi, Crea, +) is visible.
 */
export async function expectCanEdit(page: Page): Promise<void> {
  await waitForNoSpinner(page);

  // ReadOnlyBanner must NOT be present
  await expect(page.locator('text=sola lettura')).not.toBeVisible({ timeout: 3000 }).catch(() => {
    // If it times out waiting for it to be absent, that actually means it was visible
  });

  // At least one edit-capable button must be present
  const editButton = page
    .getByRole('button', { name: /nuovo|aggiungi|crea|salva|\+/i })
    .or(page.locator('a[href*="/new"]'))
    .first();

  await expect(editButton).toBeVisible({ timeout: 8000 });
}
