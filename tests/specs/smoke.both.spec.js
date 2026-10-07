import { test, expect } from '@playwright/test';
import { open, projects } from './helpers.js';

test('Seite lädt ohne Konsolen-/Seitenfehler und ohne fremde Anfragen', async ({ page }) => {
  const errors = [], foreign = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (new URL(r.url()).hostname !== '127.0.0.1') foreign.push(r.url()); });
  await open(page);
  await page.waitForLoadState('networkidle');       // auch das Vorladen aller Bilder ist durch
  expect(errors).toEqual([]);
  expect(foreign, 'alles kommt von 127.0.0.1 (Schrift nicht von Google)').toEqual([]);
});

test('Aufbau: Karten, #top, #links, Schrift', async ({ page }) => {
  await open(page);
  await expect(page.locator('.slide')).toHaveCount(projects.length);
  await expect(page.locator('#top')).toHaveCount(1);
  await expect(page.locator('#links')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.fonts.check('600 30px "Hanken Grotesk"'))).toBe(true);
});

test('Manifest und Icon-Links liefern 200', async ({ page }) => {
  await open(page);
  const abs = h => new URL(h, page.url()).href;
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await page.request.get(abs(manifest));
  expect(res.status()).toBe(200);
  const json = await res.json();                    // gültige Daten
  expect(json.name).toBe('msmr.dev');
  expect(json.icons.length).toBeGreaterThan(0);
  const hrefs = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll(l => l.map(e => e.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const h of [...hrefs, ...json.icons.map(i => i.src)]) {
    expect((await page.request.get(abs(h))).status(), h).toBe(200);
    expect(h, 'Icons tragen ?v=').toMatch(/\?v=\d+$/);
  }
});
