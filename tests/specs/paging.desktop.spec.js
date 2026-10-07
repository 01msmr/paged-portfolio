import { test, expect } from '@playwright/test';
import { open, expectAt, scrollY, tops } from './helpers.js';

test('Pfeil nach unten/oben: genau eine Karte', async ({ page }) => {
  await open(page);
  await expectAt(page, 0);
  await page.keyboard.press('ArrowDown'); await expectAt(page, 1);
  await page.keyboard.press('ArrowDown'); await expectAt(page, 2);
  await page.keyboard.press('ArrowUp');   await expectAt(page, 1);
});

test('ein Mausrad-Ereignis = eine Karte', async ({ page }) => {
  await open(page);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 100); await expectAt(page, 1);
  await page.mouse.wheel(0, 100); await expectAt(page, 2);
});

test('drei Mausrad-Ereignisse in 100 ms (Nachschwung) = eine Karte', async ({ page }) => {
  await open(page);
  await page.mouse.move(640, 400);
  await page.evaluate(() => { window.__maxY = 0; addEventListener('scroll', () => { window.__maxY = Math.max(window.__maxY, scrollY); }); });
  await Promise.all([page.mouse.wheel(0, 100), page.mouse.wheel(0, 100), page.mouse.wheel(0, 100)]);
  await expectAt(page, 1);
  const t = await tops(page);
  expect(await page.evaluate(() => window.__maxY), 'nie über die erste Karte hinaus').toBeLessThanOrEqual(t[1] + 2);
  expect(await scrollY(page)).toBeLessThanOrEqual(t[1] + 2);
});
