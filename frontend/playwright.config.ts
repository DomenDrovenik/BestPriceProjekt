import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Konfiguracija Playwright Test za BestPrice.
 *
 * Funkcionalni testi TP-01 … TP-05 so v tests/funkcionalni in tests_Anja/funkcionalni.
 * Zagona: npm run test:e2e oziroma npm run test:e2e:anja (ločena konfiguracija).
 * Obstoječi testi (tests/test-1.spec.ts) ostanejo v isti mapi in se izvedejo z »npx playwright test«.
 *
 * Spremenljivke okolja (lokalno v frontend/.env.e2e, glej .env.e2e.example):
 *   TEST_USER_PASSWORD  geslo testnega računa (obvezno za TP-03, TP-04, TP-05)
 *   TEST_USER_EMAIL     privzeto test@test.si
 *   BASE_URL            privzeto http://localhost:5173 (backend CORS dovoli samo ta izvor)
 *   API_URL             privzeto http://localhost:3000
 *   PW_START_SERVERS    0 = ne zaganjaj frontenda/backenda (uporabi že zagnana)
 *   PW_ALL_BROWSERS     1 = poleg Chromiuma še Firefox in WebKit
 *   COMPARE_API_URL     neobvezno: preusmeritev /api/compare-prices (TP-02) na ta backend
 *   E2E_PRODUCT_PRICE   neobvezno: pričakovana cena izdelka (privzeto 1.65), ko se cena v bazi spremeni
 */

const envFiles = [
  fileURLToPath(new URL('./.env.e2e', import.meta.url)),
  fileURLToPath(new URL('./.env.e2e.example', import.meta.url)),
];
if (typeof process.loadEnvFile === 'function') {
  const envFile = envFiles.find((file) => fs.existsSync(file) && fs.statSync(file).size > 0);
  if (envFile) process.loadEnvFile(envFile);
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const CI = !!process.env.CI;
const startServers = process.env.PW_START_SERVERS !== '0';
const frontendPort = new URL(BASE_URL).port || '5173';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : 2,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    headless: true,
    locale: 'sl-SI',
    timezoneId: 'Europe/Ljubljana',
    viewport: { width: 1440, height: 900 }, // namizna navigacija (lg) je vidna
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    ...(process.env.PW_ALL_BROWSERS === '1'
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],

  webServer: startServers
    ? [
        {
          // Backend (Express) – potrebuje backend/.env oz. spremenljivke DATABASE_URL, DB_NAME, PORT, RESEND_API_KEY.
          command: 'npm start',
          cwd: '../backend',
          // Backend začne poslušati, preden se poveže z MongoDB. Ta GET (samo branje) vrne 200 šele,
          // ko je baza povezana; prej vrne 500, zato Playwright čaka.
          url: `${API_URL}/api/compare-prices?name=mleko`,
          reuseExistingServer: !CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          // Frontend (Vite) – VITE_API_URL mora kazati na API_URL, VITE_FIREBASE_* na testni Firebase projekt.
          command: `npm run dev -- --port ${frontendPort} --strictPort`,
          url: BASE_URL,
          reuseExistingServer: !CI,
          timeout: 120_000,
        },
      ]
    : undefined,
});
