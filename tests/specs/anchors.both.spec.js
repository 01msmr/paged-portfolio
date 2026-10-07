import { test, expect } from '@playwright/test';
import { open, projects } from './helpers.js';

test('Sprunglinks: Kennung mit Ziffer/Punkt und href="#" lösen keinen Fehler aus; echter Menülink gleitet zur Karte', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page);
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend',
      '<a id="t1" href="#3d-test" style="position:fixed;left:8px;top:80px;z-index:999;background:#fff">x</a>' +
      '<a id="t2" href="#"        style="position:fixed;left:8px;top:110px;z-index:999;background:#fff">y</a>' +
      '<a id="t3" href="#v1.2"    style="position:fixed;left:8px;top:140px;z-index:999;background:#fff">z</a>' +
      '<section id="3d-test" style="height:10px"></section>');
  });
  for (const id of ['#t1', '#t2', '#t3']) await page.locator(id).click();
  expect(errors).toEqual([]);

  // echter Menülink (auf Telefon/Start außerhalb des Bildes: Klick-Ereignis direkt auf dem Element)
  await page.locator('.nav a[href="#doday"]').evaluate(a => a.click());
  const i = projects.findIndex(p => p.id === 'doday') + 1;
  const pos = () => page.evaluate(() => matchMedia('(hover:none)').matches ? document.querySelector('.pager').scrollTop : scrollY);
  const top = await page.evaluate(() => document.getElementById('doday').offsetTop);
  await expect.poll(pos, { timeout: 3000 }).toBeGreaterThanOrEqual(top - 2);
  await expect.poll(pos, { timeout: 3000 }).toBeLessThanOrEqual(top + 2);
  expect(i).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
