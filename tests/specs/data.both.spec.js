import { test, expect } from '@playwright/test';
import { open, projects } from './helpers.js';

for (const p of projects) {
  test(`${p.id}: Karte, Menüpunkt und Eintrag auf der Linkseite`, async ({ page }) => {
    await open(page);
    await expect(page.locator(`section.slide[id="${p.id}"]`)).toHaveCount(1);
    await expect(page.locator(`.nav a[href="#${p.id}"]`)).toHaveCount(1);
    const links = await page.locator('#links .links a').evaluateAll(l => l.map(a => a.getAttribute('href')));
    expect(links).toContain(p.url);
  });
}

test('Alle Projekt-Adressen sind https', async () => {
  for (const p of projects) {
    expect(p.url, p.id).toMatch(/^https:\/\//);
    for (const t of p.title) if (t.url) expect(t.url, `${p.id}: ${t.label}`).toMatch(/^https:\/\//);
  }
});

test('Externe Links: target=_blank + noopener, Links auf msmr.dev ohne target', async ({ page }) => {
  await open(page);
  const all = await page.locator('a[href^="http"]').evaluateAll(l => l.map(a => ({ href: a.href, target: a.getAttribute('target'), rel: a.getAttribute('rel') })));
  expect(all.length).toBeGreaterThan(0);
  for (const a of all) {
    if (new URL(a.href).hostname === 'msmr.dev') expect(a.target, a.href).toBeNull();
    else { expect(a.target, a.href).toBe('_blank'); expect(a.rel, a.href).toContain('noopener'); }
  }
});
