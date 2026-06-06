import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test credentials from tests/e2e/.env.test (git-ignored)
dotenv.config({ path: path.resolve(__dirname, 'tests/e2e/.env.test') });

const CI = process.env.CI === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: CI ? 1 : 0,
  workers: 1, // serial — avoids Firebase rate-limits and session conflicts

  use: {
    baseURL: 'https://www.tequierofeliz.com',
    headless: CI ? true : false,
    viewport: { width: 390, height: 844 }, // iPhone 14 — matches mobile-first UI
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
