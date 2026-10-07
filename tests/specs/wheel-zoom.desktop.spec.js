import { test, expect } from '@playwright/test';
import { open } from './helpers.js';

const wheel = (page, ctrl) => page.evaluate(ctrl => {
  const e = new WheelEvent('wheel', { deltaY: 100, ctrlKey: ctrl, cancelable: true, bubbles: true });
  document.body.dispatchEvent(e);
  return e.defaultPrevented;
}, ctrl);

test('Strg + Mausrad (Zoomen) wird nicht verhindert', async ({ page }) => {
  await open(page);
  expect(await wheel(page, true)).toBe(false);
});

test('Mausrad ohne Strg wird verhindert (die Seite blättert)', async ({ page }) => {
  await open(page);
  expect(await wheel(page, false)).toBe(true);
});
