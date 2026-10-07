import { test, expect } from '@playwright/test';
import { open, projects } from './helpers.js';

test('Telefon: lädt ohne Fehler; Tipp auf die Nachbarnummer wechselt zum nächsten Projekt', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  // erstes Projekt ins Bild (die Leiste liegt auf dem Startbildschirm außerhalb)
  await page.evaluate(() => { const p = document.querySelector('.pager'); p.scrollTo({ top: document.querySelectorAll('.hero, .slide')[1].offsetTop, behavior: 'instant' }); });
  const first = `#${projects[0].id}`, second = `#${projects[1].id}`;
  await expect(page.locator('.nav a[aria-current]')).toHaveAttribute('href', first);
  await expect(page.locator(`section${first}`)).toHaveClass(/is-active/);
  const next = page.locator(`.nav a[href="${second}"]`);
  await expect(next).not.toHaveClass(/far/);                  // Nachbar: als Nummer sichtbar
  await next.tap();
  const top = await page.evaluate(id => document.querySelector(id).offsetTop, second);
  const pos = () => page.evaluate(() => document.querySelector('.pager').scrollTop);
  await expect.poll(pos, { timeout: 3000 }).toBeGreaterThanOrEqual(top - 2);
  await expect.poll(pos, { timeout: 3000 }).toBeLessThanOrEqual(top + 2);
  await expect(page.locator('.nav a[aria-current]')).toHaveAttribute('href', second);
  await expect(page.locator('.nav a[aria-current]')).toHaveCount(1);
  await expect(page.locator(`section${second}`)).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});
