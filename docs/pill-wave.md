# Link-pill wave — status and history

## Status (2026-10-07)
Hovering a link pill (project titles `.title a`, urls `.links a`) for 1.2 s starts one 7.2 s movement of a liquid wave along the pill's top edge. Mouse only, not with reduced motion. Code: `main.js` block 6 (`liqStart`, ~78 lines), CSS: `style.css` (`::before` with `clip-path: var(--liq)`).

Randomised per hover (truncated-normal "bell curve"): crest count 1–3, height (≤ 12 % of the pill height), crest radius (1×–3× the pill's end radius, never smaller), direction, duration (7.2 s ± 1.4 s), start delay (1.2 s ± 0.1 s), travel (0.1–1.9× of about 1.32 pill widths, half of it independent of the pill length). Speed: one smooth slow–fast–slow curve (middle only mildly faster), never zero. Gate: grows to the middle and falls back as the exact mirror image. All curves G3 (`smooth7`); ends run out smoothly, never cutting into the end half circles.

## How it came about
1. Sep 24–28: pill basics and a first wave (a few commits per day).
2. Sep 29 – Oct 1: pill geometry (insets, radii), liquid fill of the cards, first travelling wave.
3. Oct 7 (44 pill commits): many short feedback rounds: no standing still, one flow, slow–fast–slow, mirror image for leaving, height cap 18 → 15 → 12 %, per-hover randomisation, small-url radius rule, end taper, speed −20 % / +10 %.
Dead ends that were dropped: wave packet, sliding carrier, volume correction, per-frame curvature clamp (plateaus), a lost `--liq-up` line (top edge cut off). Lesson: pick amplitude and wavelength up front, never correct per frame.

## Effort
**Making it** (from `git log`): 80 of 285 commits mention pills/waves (about 28 %); on Oct 7 alone 44. The code is about 78 of 1274 lines of `main.js` (about 6 %), about 9 KB raw and 4 KB gzipped (of 83 KB). The effort was therefore mostly tuning, not code volume.

**Rendering** (estimates, not measured in the browser — the Chrome test tab was unfocused and throttled):
- Server: none. Static JS/CSS, no request, no PHP involvement; the wave runs only on the client.
- Browser: about 0.02 ms of script per frame (node micro-benchmark of the same maths: 64 cosines plus a ~2.5 KB `path()` string), about 430 frames per hover (7.2 s × 60 fps), only while a pill is hovered. The real cost is the repaint of one pill's clip-path per frame, which stays on one small element.
