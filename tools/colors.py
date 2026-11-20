#!/usr/bin/env python3
"""Projektfarben prüfen und vorschlagen — eine Regel für alle Farben von msmr.dev:

  · jede Farbe unterscheidet sich von JEDER anderen um mindestens ΔE 0,115 (Abstand in OKLab, so wie ein
    normaler Bildschirm sie zeigt: Farben außerhalb von sRGB werden erst auf den darstellbaren Bereich gekürzt)
  · dunkle Schrift (#191b1d) bleibt lesbar: Kontrast mindestens 4,5 : 1 (WCAG AA)
  · die Farbe ist darstellbar (sRGB) und nicht grau: Chroma mindestens 0,08

    python3 tools/colors.py                 Regel für alle Paare prüfen
    python3 tools/colors.py next            Farbe für das nächste Projekt vorschlagen (größter Abstand zu allen)
    python3 tools/colors.py fix <id>        nächstgelegene gültige Farbe für ein Projekt (möglichst kleine Änderung)

Farben stehen in projects.json als "hue": [Chroma, Farbton, Helligkeit] (Helligkeit ohne Angabe 0,70).
"""
import itertools, json, math, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIN_DE, MIN_CONTRAST, MIN_C, INK_LUM = .115, 4.5, .08, .011   # INK_LUM: relative Leuchtdichte von #191b1d


def lab(L, C, h):
    return (L, C * math.cos(math.radians(h)), C * math.sin(math.radians(h)))


def lin_rgb(L, C, h):
    _, a, b = lab(L, C, h)
    l_, m_, s_ = L + .3963377774 * a + .2158037573 * b, L - .1055613458 * a - .0638541728 * b, L - .0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    return (4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
            -.0041960863 * l - .7034186147 * m + 1.7076147010 * s)


def in_srgb(L, C, h):
    return all(-.0005 <= v <= 1.0005 for v in lin_rgb(L, C, h))


def shown(L, C, h):
    """Farbe, wie ein sRGB-Bildschirm sie zeigt: Chroma gekürzt, bis sie darstellbar ist."""
    while C > 0 and not in_srgb(L, C, h):
        C -= .002
    return L, max(C, 0), h


def contrast(L, C, h):
    r, g, b = (min(1, max(0, v)) for v in lin_rgb(*shown(L, C, h)))
    return (.2126 * r + .7152 * g + .0722 * b + .05) / (INK_LUM + .05)


def hexcode(L, C, h):
    enc = lambda v: 12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055
    return '#' + ''.join(f'{round(min(1, max(0, enc(max(0, v)))) * 255):02x}' for v in lin_rgb(*shown(L, C, h)))


def de(p, q):
    return math.dist(lab(*shown(*p)), lab(*shown(*q)))


def load():
    ps = json.load(open(ROOT / 'projects.json'))
    return [(p['id'], (p['hue'][2] if len(p['hue']) > 2 else .7, p['hue'][0], p['hue'][1])) for p in ps]


def valid(c):
    return in_srgb(*c) and c[1] >= MIN_C and contrast(*c) >= MIN_CONTRAST


def candidates():
    for L10 in range(62, 93):                  # Helligkeit 0,62–0,92 (dunkler wird die Schrift unleserlich)
        for h in range(0, 360, 2):
            C = MIN_C
            while in_srgb(L10 / 100, C, h) and C <= .22:
                yield (L10 / 100, round(C, 3), h)
                C += .01


def fmt(c):
    L, C, h = c
    return f'[{C:.3f}, {h}, {L:.2f}]  oklch({L * 100:.0f}% {C:.3f} {h})  {hexcode(*c)}  Kontrast {contrast(*c):.1f}:1'


def check(colors):
    bad = [(de(a[1], b[1]), a[0], b[0]) for a, b in itertools.combinations(colors, 2) if de(a[1], b[1]) < MIN_DE]
    low = [(i, contrast(*c)) for i, c in colors if contrast(*c) < MIN_CONTRAST]
    near = min((de(a[1], b[1]), a[0], b[0]) for a, b in itertools.combinations(colors, 2))
    print(f'engstes Paar: {near[1]} – {near[2]}  ΔE {near[0]:.3f}  (Regel: ≥ {MIN_DE})')
    for d, a, b in sorted(bad):
        print(f'  zu ähnlich: {a} – {b}  ΔE {d:.3f}')
    for i, k in low:
        print(f'  Schrift zu schwach auf {i}: {k:.1f}:1')
    print('alle Farben erfüllen die Regel' if not bad and not low else 'Regel verletzt')
    return not bad and not low


def best_next(colors):
    others = [c for _, c in colors]
    score = lambda c: min(de(c, o) for o in others)
    c = max((c for c in candidates() if valid(c)), key=score)
    return c, score(c)


def nearest_fix(colors, pid):
    cur = dict(colors)[pid]
    others = [c for i, c in colors if i != pid]
    ok = [c for c in candidates() if valid(c) and min(de(c, o) for o in others) >= MIN_DE]
    return min(ok, key=lambda c: de(c, cur)) if ok else None


if __name__ == '__main__':
    colors = load()
    if len(sys.argv) > 1 and sys.argv[1] == 'next':
        c, s = best_next(colors)
        print(f'nächstes Projekt: {fmt(c)}   Abstand zur nächsten Farbe ΔE {s:.3f}')
    elif len(sys.argv) > 2 and sys.argv[1] == 'fix':
        pid = sys.argv[2]
        c = nearest_fix(colors, pid)
        print(f'{pid}: jetzt {fmt(dict(colors)[pid])}')
        print(f'{pid}: gültig  {fmt(c)}   Änderung ΔE {de(c, dict(colors)[pid]):.3f}' if c else f'{pid}: keine gültige Farbe gefunden')
    else:
        sys.exit(0 if check(colors) else 1)
