/**
 * E2E: Planner permission matrix
 *
 * Verifies that every user in TEST_USERS can access exactly the pages assigned
 * by the Superadmin for their team, and is blocked from all others.
 *
 * Run:
 *   npx playwright test tests/e2e/planner-access.spec.ts --reporter=list,html
 *
 * Prerequisites:
 *   tests/e2e/.env.test must exist with real credentials (see .env.test.example).
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import {
  loginAs,
  logout,
  waitForNoSpinner,
  expectMenu,
  expectAccessDenied,
  expectReadOnly,
  expectCanEdit,
} from './helpers';
import { TEST_USERS, SECTIONS, TestUser, policyFor } from './users.fixture';

// ─── Tile config ─────────────────────────────────────────────────────────────

const TEQF_TILES = ['Cash Control', 'Mobili', 'Fiori', 'Eventi', 'Orario di Lavoro', 'Portfolio'];
const XB_TILES   = ['Eventi', 'Mobili', 'Fiori', 'Portfolio'];

// Tiles that XB must NOT see (TeQF-only)
const XB_EXCLUDED_TILES = ['Cash Control', 'Orario di Lavoro'];

// ─── Robust login (retry once, then throw with clear message) ─────────────────

async function robustLogin(page: Page, email: string, password: string, label: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await loginAs(page, email, password);
      return;
    } catch (err) {
      if (attempt === 2) {
        throw new Error(
          `\n\n⛔ Login failed twice for "${label}" (${email}).\n` +
          `Check credentials in tests/e2e/.env.test before re-running.\n` +
          `Original error: ${err}\n`
        );
      }
      // Brief pause before retry
      await page.waitForTimeout(2000);
      await page.goto('/planner/login').catch(() => {});
    }
  }
}

// ─── Helper: navigate to a section and wait for content ──────────────────────

async function gotoSection(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForNoSpinner(page, 12000);
}

// ─── Helper: events page "read" check ────────────────────────────────────────
// Events page for TeQF is read-only but shows no ReadOnlyBanner — just no create button.

async function expectEventsReadOnly(page: Page): Promise<void> {
  await waitForNoSpinner(page);
  // Must NOT be blocked
  await expect(page.locator('text=Accesso non consentito')).not.toBeVisible({ timeout: 3000 })
    .catch(() => { throw new Error('Events page showed AccessDenied for TeQF (should be read-only, not denied)'); });
  // Must NOT have a "Nuovo evento" / create button
  const createBtn = page.getByRole('button', { name: /nuovo|crea|aggiungi/i })
    .or(page.getByRole('link', { name: /nuovo|crea|aggiungi/i }));
  await expect(createBtn).not.toBeVisible({ timeout: 3000 }).catch(() => {
    // If button found — that's an error
    throw new Error('Events page showed a create button for TeQF (should be read-only)');
  });
}

// ─── Per-user describe blocks ─────────────────────────────────────────────────

for (const user of TEST_USERS) {
  test.describe(`[${user.team}] ${user.label}`, () => {
    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }: { browser: Browser }) => {
      context = await browser.newContext();
      page = await context.newPage();

      const email = process.env[user.emailEnvKey];
      const pass  = process.env[user.passEnvKey];

      if (!email || !pass) {
        throw new Error(
          `Missing credentials for "${user.label}".\n` +
          `Set ${user.emailEnvKey} and ${user.passEnvKey} in tests/e2e/.env.test.`
        );
      }

      await robustLogin(page, email, pass, user.label);
    });

    test.afterAll(async () => {
      // Navigate back to dashboard before closing (avoids stray requests)
      await page.goto('/planner').catch(() => {});
      await context.close();
    });

    // ── Dashboard tiles ───────────────────────────────────────────────────────

    test('dashboard — correct tiles visible', async () => {
      await page.goto('/planner', { waitUntil: 'domcontentloaded' });
      await waitForNoSpinner(page);

      if (user.team === 'TeQF') {
        await expectMenu(page, TEQF_TILES);
      } else {
        await expectMenu(page, XB_TILES, XB_EXCLUDED_TILES);
      }
    });

    // ── Section permission matrix ─────────────────────────────────────────────

    for (const section of SECTIONS) {
      const policy = policyFor(user.team, section);

      test(`${section.label} → expected: ${policy}`, async () => {
        await gotoSection(page, section.path);

        if (policy === 'none') {
          await expectAccessDenied(page);
          return;
        }

        // Must reach the page without access denied
        await expect(page.locator('text=Accesso non consentito'))
          .not.toBeVisible({ timeout: 3000 })
          .catch(() => {
            throw new Error(
              `"${section.label}" showed AccessDenied for ${user.label} but policy is "${policy}"`
            );
          });

        if (policy === 'edit') {
          await expectCanEdit(page);
        } else {
          // 'read'
          if (section.path === '/planner/events') {
            await expectEventsReadOnly(page);
          } else {
            await expectReadOnly(page);
          }
        }
      });
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    test('logout — redirected to login page', async () => {
      await page.goto('/planner', { waitUntil: 'domcontentloaded' });
      await waitForNoSpinner(page);
      await logout(page);
      await expect(page).toHaveURL(/\/planner\/login/, { timeout: 8000 });

      // Re-login for subsequent tests if any (afterAll expects page to be navigable)
      const email = process.env[user.emailEnvKey]!;
      const pass  = process.env[user.passEnvKey]!;
      await robustLogin(page, email, pass, user.label);
    });
  });
}

// ─── Post-new-user checklist reminder ─────────────────────────────────────────
// When the Superadmin creates a new user, add them to TEST_USERS in users.fixture.ts:
//
//   {
//     label: 'newuser (TeamName)',
//     emailEnvKey: 'NEWUSER_EMAIL',
//     passEnvKey: 'NEWUSER_PASS',
//     team: 'TeQF' | 'XB',
//   }
//
// Then add NEWUSER_EMAIL and NEWUSER_PASS to tests/e2e/.env.test (never commit it).
// Re-run: npx playwright test tests/e2e/planner-access.spec.ts --reporter=list,html
