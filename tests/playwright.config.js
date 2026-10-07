// Browser-Tests für msmr.dev — nur für die Entwicklung, die Seite lädt davon nichts.
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'specs',
  workers: CI ? 1 : 2,
  expect: { timeout: 3000 },                 // höchstens 3 s Geduld je Erwartung (expect.poll / toPass)
  retries: CI ? 1 : 0,                      // CI: ein zweiter Versuch; im Bericht jeden Test nennen, der erst dann bestand
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:8765/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'php -S 127.0.0.1:8765 -t ..',
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !CI,               // lokal darf ein schon laufender Server weiterverwendet werden
  },
  projects: [
    {
      name: 'desktop',                      // *.desktop.spec.js und *.both.spec.js
      testMatch: /.*\.(desktop|both)\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, colorScheme: 'light' },
    },
    {
      name: 'phone',                        // *.phone.spec.js und *.both.spec.js — WebKit wie iPhone/iPad, Touchbedienung
      testMatch: /.*\.(phone|both)\.spec\.js/,
      use: { ...devices['iPhone 13'] },
    },
  ],
});
