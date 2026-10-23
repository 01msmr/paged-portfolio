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
