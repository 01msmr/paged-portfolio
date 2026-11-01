# msmr.dev
> Governed by **CLAUDE MASTER** (`../CLAUDE.md`). Rules here extend it; they do not override it.

Portfolio-Seite: PHP rendert eine HTML-Seite aus `projects.json`. Kein Build-Schritt, kein Framework.

## Befehle
- `cd tests && npm test` — Playwright-Browser-Tests (vor jedem Push ausführen)
- `php -S localhost:8080` — lokale Vorschau

## Regeln
- `projects.json` ist die einzige Quelle für alle Projekte — Cards, Nav, Links, Icons entstehen daraus.
- Shared values (Farben, Linienstärken, Timing) liegen in `:root` von `style.css`; `main.js` liest sie von dort.
- Ein Push deployt direkt auf den Server (`git push` → Webhook → Plesk zieht `main`).
- Neue Screenshots: `img/<name>.webp`, dann Eintrag in `projects.json`.
