// Gemeinsame Hilfen der Tests. Wartezeiten nur über expect.poll / toPass (höchstens 3 s), nie feste Pausen.
import fs from 'node:fs';
import { expect } from '@playwright/test';

export const projects = JSON.parse(fs.readFileSync(new URL('../../projects.json', import.meta.url), 'utf8'));

/** Seite laden und warten, bis main.js den Anfangszustand gesetzt hat (01 ist aktiv). */
export async function open(page, hash = '') {
  await page.goto('/' + hash);
  await expect(page.locator('.nav a[aria-current="true"]')).toHaveCount(1, { timeout: 3000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Oberkanten der Bildschirme: Start, Projekte, Linkseite. */
export const tops = page => page.evaluate(() => [...document.querySelectorAll('.hero, .slide, .end')].map(e => e.offsetTop));

export const scrollY = page => page.evaluate(() => scrollY);

/** Wartet, bis die Seite auf der Oberkante des Bildschirms i steht (± 2 px) und stehen bleibt. */
export async function expectAt(page, i) {
  const t = (await tops(page))[i];
  await expect.poll(() => scrollY(page), { timeout: 3000 }).toBeGreaterThanOrEqual(t - 2);
  await expect.poll(() => scrollY(page), { timeout: 3000 }).toBeLessThanOrEqual(t + 2);
  await settled(page);
}

/** Wartet (in Bildern, nicht in Zeit), bis die Seite 12 Bilder lang stillsteht — das Gleiten ist dann wirklich zu Ende
 *  (die Seite ignoriert Rad und Tasten, solange es läuft). */
export const settled = page => page.evaluate(() => new Promise(done => {
  let last = -1, still = 0;
  const frame = () => { if (scrollY === last) { if (++still >= 12) return done(); } else { still = 0; last = scrollY; } requestAnimationFrame(frame); };
  frame();
}));

/** Index des Bildschirms, dessen Oberkante der Scrollposition am nächsten ist. */
export async function here(page) {
  const [t, y] = await Promise.all([tops(page), scrollY(page)]);
  return t.reduce((b, v, j) => (Math.abs(v - y) < Math.abs(t[b] - y) ? j : b), 0);
}

/** Pfeil nach unten n-mal, jeweils bis die Seite auf dem nächsten Bildschirm steht. */
export async function down(page, n) {
  for (let k = 0; k < n; k++) {
    const i = await here(page);
    await page.keyboard.press('ArrowDown');
    await expectAt(page, i + 1);
  }
}
