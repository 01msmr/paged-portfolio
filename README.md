# msmr.dev

[msmr.dev](https://msmr.dev): web & more, one screen per project. On the site this project is called “paged portfolio”; its repository is [01msmr/paged-portfolio](https://github.com/01msmr/paged-portfolio) (renamed from msmr.dev — GitHub forwards the old address, also for `git pull`).

No build step and no framework. The server renders one PHP page from a JSON list of projects. The wordmark shrinks along one curve into the header while you scroll. Each project snaps into place as its own screen. Hovering a card fills it with the project's colour like a thick liquid that bulges toward the cursor. Clicking shows a halftone of the project, and a double-click shows the full screenshot. The last screen links to every project.

## Files

| | |
|---|---|
| `projects.json` | **the one source for all projects**: name, colour, links, text, tech, image. Cards, nav, link list and icons are all built from it |
| `index.php` | the page template, rendered on every request |
| `style.css`, `main.js` | styling and behaviour. Shared values (colours, line widths `--stroke`/`--nav-line`, nav timing `--nav-t`/`--nav-ease`) live in `:root` of `style.css`; `main.js` reads the nav timing from there and is organised in numbered blocks (see its header) |
| `img/<name>.webp` | screenshot of a project: shown on double-click, and drawn as a halftone on click |
| `fonts/` | Hanken Grotesk (Latin subset, SIL OFL), served from this site; used for everything |
| `app-icons/`, `site.webmanifest.php` | favicons, iOS and Android icons in every project colour; page and manifest pick one at random on each request |
| `tools/icons.py` | regenerates the icons from `projects.json` (needs fontTools and ImageMagick) |
| `tools/colors.py` | checks the colour rule for all projects and suggests colours (see below) |
| `.htaccess` | caching and compression rules for the server |

## Local preview

```sh
php -S localhost:8765        # then open http://localhost:8765
```

This needs PHP (`brew install php`). The built-in server runs the page exactly as the live server does.

## Deployment

Push to `main`. A GitHub webhook tells the netcup server to pull. `bash tools/check.sh` (PHP and JS syntax, `projects.json`, one icon set per project, colour rule) runs locally and automatically on every push (`.github/workflows/validate.yml`); a broken `projects.json` also makes `index.php` fail loudly instead of rendering half a page.

`style.css` and `main.js` are linked with their modification time (`?v=…`), so browsers cache them for a year and still load a new version right after a change. The page itself is always fetched fresh.

## Tests and measurements

Only for development: nothing in `tests/` is ever loaded by the site, and the site itself still has no build step.

```sh
cd tests && npm ci && npx playwright install chromium webkit && npm test
```

Playwright starts its own `php -S` on port 8765 and runs two environments: `desktop` (Chromium, 1280 × 800, mouse) and `phone` (WebKit, iPhone 13, touch). Files named `*.desktop.spec.js`, `*.phone.spec.js` and `*.both.spec.js` run in the matching environment(s). The same tests run on every push (`.github/workflows/tests.yml`).

## Adding a project

1. Add an entry to `projects.json`, in timeline position (newest first):

   ```json
   {
     "id": "short-id",
     "name": "Name in the nav",
     "hue": [0.2, 120],
     "url": "https://… (link on the last screen)",
     "title": [{ "label": "Title", "url": "https://…" }],
     "text": "One short line (\n for a line break).",
     "tech": ["…", "Claude"],
     "shot": "img/short-id.webp?v=1"
   }
   ```

   `hue` is chroma, hue and (optionally) lightness of the colour `oklch(lightness chroma hue)`, lightness 0.70 if left out.

   **Colour rule:** every project colour differs from *every* other one by at least ΔE 0.13 (distance in OKLab, as a normal screen shows the colour), dark text stays readable on it (contrast ≥ 4.5 : 1), and it is not grey (chroma ≥ 0.08). There is one group only — all colours carry dark text. With the current eight colours there is room for about six more. `tools/colors.py` does the work:

   ```sh
   python3 tools/colors.py            # check all pairs (exit code 1 if the rule is broken)
   python3 tools/colors.py next       # colour for the next project: the one furthest from all others
   python3 tools/colors.py fix <id>   # nearest valid colour for a project that breaks the rule
   ```

2. Regenerate the icons so there is one per project colour: `python3 tools/icons.py` (this also writes `app-icons/favicon.ico`, which `.htaccess` serves for requests to `/favicon.ico`, so the host's default icon never shows).
3. Image (optional): save a screenshot, about 1600 px wide, as WebP:

   ```sh
   magick screenshot.png -resize 1600x -quality 72 img/<id>.webp
   ```

   When you replace an image, raise the `?v=` number in `shot` so browsers load the new one.

## Behaviour

**Scrolling: one project per gesture.** The script moves the page, so every gesture lands exactly on a card edge. On desktop, CSS scroll snapping stays only as a backstop, for example when you drag the scrollbar.

- **Desktop:** a mouse-wheel notch or trackpad swipe moves one card; trackpad momentum is ignored. The glide takes over the speed of the gesture (ease-out, duration = 3 × distance ÷ speed), 0.3–0.65 s, start ↔ first card up to 1.05 s. Arrow keys (↑ ↓ ← →), Page Up/Down and Space move one card, and so does a sideways trackpad swipe.
- **Touch (iPhone/iPad):** the page scrolls inside `.pager` (iOS snaps the whole page only after the momentum and then corrects visibly). The finger drives the page 1:1; on release a quick swipe or a quarter-screen drag moves one card, otherwise it springs back. The glide continues at the finger's release speed and settles on the edge, 0.25–0.52 s, start ↔ first card up to 0.9 s. The liquid in the target card starts rising 0.33 s before the glide ends. Sideways swipes move one card, like vertical ones. Cards taller than the screen scroll freely inside.

**Header.** Below the full-width wordmark the start screen reads “web & more.”; where the rising wordmark passes over it, the line is hidden exactly at the letters' lower edge. More: [docs/behaviour.md](docs/behaviour.md#header)

**Navigation** (layout by width):

| Width | Nav |
|---|---|
| ≥ 1100 px | all names with dividers; the colour window follows the mouse |
| 1024–1099 px | the same, tighter |
| 700–1023 px | active item centred beside the wordmark, with one neighbour number on each side |
| < 700 px | active item with one neighbour number on each side; invisible placeholders keep the layout constant at both ends |

**Nav on the start screen.** In every nav, the first project is already active on the start screen (name, window, line), so nothing moves on the switch start → first project. More: [docs/behaviour.md](docs/behaviour.md#nav-on-the-start-screen)

**Narrow nav numbers.** In the narrow nav the numbers are exactly as tall as the lowercase letters of the wordmark and sit, like the names, vertically centred in the window, with 50 % more padding beside them than before. More: [docs/behaviour.md](docs/behaviour.md#narrow-nav-numbers)

**Cards.** Hover (desktop) fills a card like a thick liquid that bulges toward the cursor. More: [docs/behaviour.md](docs/behaviour.md#cards)

The line under a card's title starts exactly below the title's first letter (measured per card, since the large title's first letter carries 5–11 px more side space).

**Far targets.** Choosing a far project or the links page from the nav (click, aim, strip): only the current card slides out and the target slides in right behind it, one card's length like a scroll gesture; the cards in between never show. Back to the start screen it glides from the first card, so the wordmark takes its curve.

**Image and details.** A click (tap) on a card cycles: plain card → halftone of the screenshot (drawn in the browser) → full screenshot → plain card. More: [docs/behaviour.md](docs/behaviour.md#image-and-details)

## Notes

- Hovering a link (card titles, links page) shows a pill in the project colour; it reaches 0.225 em beyond the name on the left and 0.29 em on the right — the tight letter spacing (−0.065 em) also trims the space after the last letter, so the right side gets that back and both sides look equal.
- Every card always fits on one screen, on every device and however many projects there are: if it's too tall, or a word is wider than the card, its type (title and line below; on the links page heading and links) shrinks just as far as needed (`fitCards` in `main.js`). The links page heading is smaller than the links, so it stands apart from them: 60 % of the link size, 75 % on touch devices.
- After 1.2 s of hovering a link (card titles, links page) a 7.2 s liquid wave runs along the top edge of its pill — randomised per hover, G3-smooth, never standing still, mouse only. Full description, history and effort: [docs/pill-wave.md](docs/pill-wave.md).
- External project links open in a new tab; links to msmr.dev itself don't. “paged portfolio” (this site) links to its repository on GitHub; Do Day links to its README, because the app itself is private.
- Fullscreen, like a presentation: key F, a double-click (double-tap) on the page background, or the small “F” in the top-left corner square (mouse only; it drifts around that square like a pool ball and glides to its centre under the cursor). iPhone Safari can't go fullscreen; there, add the site to the Home Screen.
- Colours follow the system's light or dark mode; in light mode page and bar are pure white.
- On desktop the nav type is 1.8× larger (`--fs-s`) and all text inside the cards — titles (also on the links page), tech details at rest, the line under a title — 1.4× (`--fs-c`, both in `style.css`); an enlarged detail and the big numbers keep their size.
- Right after the page has loaded, all screenshots are fetched and their halftones drawn one after another, so fast scrolling never meets an unloaded card. Fonts come from this site, not from Google.
- Each card's screenshot is also its background: always faintly visible (3 %), growing linearly to 33 % over 6 s once the pointer, touch and scrolling have been still for 1.5 s, and back to 3 % within 0.25 s on any activity (`.rest-img`, `main.js` “Ruhebild”). Click/tap still shows the halftone and the full image.
- On touch devices there is no text selection, loupe or grey tap flash, so holding and tapping stay with the page's own gestures. Pinch zoom stays, and project links keep their long-press menu.
- Motion respects `prefers-reduced-motion`: pages jump instead of gliding, cards fill plainly instead of as a liquid, and the cursor has no trail.
- Without JavaScript the page still reads top to bottom, with a small static wordmark.
