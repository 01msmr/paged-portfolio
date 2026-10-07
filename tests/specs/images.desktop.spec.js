import { test, expect } from '@playwright/test';
import { open, down } from './helpers.js';

const at = { position: { x: 600, y: 200 } };

test('Klick auf eine Karte mit Bild: is-shot → is-full → leer', async ({ page }) => {
  await open(page);
  await down(page, 3);                                       // #korrekturen
  const card = page.locator('#korrekturen .card');
  await expect(card).not.toHaveClass(/is-(shot|full)/);
  await card.click(at); await expect(card).toHaveClass(/is-shot/);
  await card.click(at); await expect(card).toHaveClass(/is-full/);
  await card.click(at); await expect(card).not.toHaveClass(/is-(shot|full)/);
});

test('Klick außerhalb der Karte schließt das Bild', async ({ page }) => {
  await open(page);
  await down(page, 3);
  const card = page.locator('#korrekturen .card');
  await card.click(at); await expect(card).toHaveClass(/is-shot/);
  await page.mouse.click(10, 400);                           // linker Rand, außerhalb der Karte
  await expect(card).not.toHaveClass(/is-(shot|full)/);
});
