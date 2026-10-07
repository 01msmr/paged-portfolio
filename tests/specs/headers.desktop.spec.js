import { test, expect } from '@playwright/test';
import { open, down } from './helpers.js';

const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

test('vier Sicherheits-Kopfzeilen auf /', async ({ request }) => {
  const h = (await request.get('/')).headers();
  expect(h['content-security-policy']).toBe(CSP);
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
});

test('Sicherheitsrichtlinie: blättern, Maus über eine Karte, Bild zweimal anklicken — keine Verstöße', async ({ page }) => {
  const cons = [];
  page.on('console', m => { if (/content security policy/i.test(m.text())) cons.push(m.text()); });
  await open(page);
  await down(page, 2);
  const box = await page.locator('.slide').nth(1).locator('.card').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });   // die Flüssigkeit steigt
  await down(page, 1);                                       // #korrekturen
  const card = page.locator('#korrekturen .card');
  await card.click({ position: { x: 600, y: 200 } });
  await expect(card).toHaveClass(/is-shot/);                 // Punktraster
  await card.click({ position: { x: 600, y: 200 } });
  await expect(card).toHaveClass(/is-full/);                 // ganzes Bild
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  expect(cons).toEqual([]);
});
