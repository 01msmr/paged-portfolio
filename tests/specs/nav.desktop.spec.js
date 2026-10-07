import { test, expect } from '@playwright/test';
import { open, down, expectAt, projects } from './helpers.js';

const current = page => page.locator('.nav a[aria-current]');

async function expectOne(page, href) {
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveAttribute('aria-current', 'true');
  await expect(current(page)).toHaveAttribute('href', href);
  await expect(page.locator('.nav a[aria-current=""]')).toHaveCount(0);
}

test('aria-current="true": genau ein Eintrag — Start, mittleres Projekt, Linkseite', async ({ page }) => {
  await open(page);
  await expectOne(page, `#${projects[0].id}`);                // Start: 01 ist aktiv
  await down(page, 3);
  await expectOne(page, `#${projects[2].id}`);                // Projekt 3
  await down(page, projects.length - 2);                      // bis zur Linkseite
  await expectOne(page, '#links');
});

test('Klick auf den Menüpunkt doday bringt die Karte ins Bild und verschiebt die Markierung', async ({ page }) => {
  await open(page);
  await down(page, 1);                                        // auf dem Startbildschirm liegt die Leiste außerhalb
  await page.locator('.nav a[href="#doday"]').click();
  await expectAt(page, projects.findIndex(p => p.id === 'doday') + 1);
  await expectOne(page, '#doday');
});
