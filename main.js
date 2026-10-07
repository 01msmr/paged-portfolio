/* msmr.dev — Verhalten der Seite. Blöcke:
   0 Grundlagen (Elemente, Scrollbereich: Fenster bzw. .pager auf Touch)
   1 Wortmarke (Bogen, Schrift-Transition; Leiste gleitet mit dem letzten Stück herein)
   2 Navigation (Einträge ↑ Projekte ↗, aktives Projekt, Farbband/-fenster, Linie unter dem aktiven Eintrag;
     voll: Schriftfarbe genau an den Fensterkanten, die Wortmarke ist der Eintrag ↑; schmal: mittig, Nachbarn als Nummern,
     keine Nummer gleitet durchs Fenster)
   3 Schmale Navigation (Auswahlrad mit Rad/Trackpad; Touch: Zielen — Fenster fest in der Mitte, Nummern ziehen durch)
   4 Blättern (aktives Projekt; Rad/Tasten auf dem Rechner, Wischen auf Touch — je Geste eine Karte,
     im Tempo der Geste; seitliche Gesten)
   5 Kopf der großen Zahl auf der Karte · Unterzeile unter dem Titel ausgerichtet · Projektbild und Details
     (Raster/Bild; Tipp auf ein Detail; weggeblättert: zurückgesetzt)
   6 Link-Pille · 7 Flüssigkeit · 8 Cursor */

/* ═══ 0 Grundlagen: Elemente, Medienabfragen, gemeinsamer Zustand ═══ */
const root    = document.documentElement;
const calm    = matchMedia('(prefers-reduced-motion: reduce)');
const narrow  = matchMedia('(max-width:1023px)');
const bar     = document.querySelector('.bar');
const mark    = document.querySelector('.mark');
const slot    = document.querySelector('.mark-slot');
const hero    = document.querySelector('.hero');
const lede    = document.querySelector('.lede');
const slides  = [...document.querySelectorAll('.slide')];
const nav     = document.querySelector('.nav');
const links   = [...nav.querySelectorAll('a')];
const hl      = nav.querySelector('.nav__hl');
nav.classList.add('instant');                   // beim Laden: Fenster und Linie gleich an ihrem Platz, ohne Gleiten (main.js 2)
const under   = nav.querySelector('.nav__under');   // Rechner: Linie unter dem aktiven Eintrag — zweiter Ausschnitt des Bands
const endLink = nav.querySelector('.nav-end');
const startLink = nav.querySelector('.nav-start');   // ↑ vor 01: nur Ziel (Startbildschirm), nie aktiv
// Einträge ↔ Bildschirme: links = ↑, Projekte, ↗ — Projekt i ist links[i + 1]. Nummern zählen rückwärts (neuestes Projekt oben,
// mit der höchsten Nummer); »01« in den Kommentaren meint den ersten Eintrag
const linkOf   = i => i >= 0 ? links[i + 1] : null;
const slideOf  = a => links.indexOf(a) - 1;                   // Projektindex eines Eintrags (↑: −1)
const screenOf = a => a === startLink ? hero : a === endLink ? endPage : slides[slideOf(a)];
const endPage = document.querySelector('.end');
const screens = [hero, ...slides, endPage];     // Start, Projekte, Linkseite
let atEnd = false;                              // Linkseite sichtbar
// Scrollbereich: auf Touch der eigene Bereich .pager (sauberes Einrasten auf iOS), sonst das Fenster
const pagerOn  = matchMedia('(hover:none)').matches;
const pager    = document.querySelector('.pager');
const scroller = pagerOn ? pager : window;
const snapEl   = pagerOn ? pager : root;        // trägt scroll-snap-type
const Y        = () => pagerOn ? pager.scrollTop : scrollY;
const toY      = y => pagerOn ? (pager.scrollTop = y) : scrollTo({ top:y, behavior:'instant' });   // immer sofort (html hat scroll-behavior:smooth)

root.classList.add('js');
// Takt der schmalen Navigation — steht nur im CSS (:root --nav-t, --nav-ease), hier gelesen
const cssRoot  = getComputedStyle(root);
const NAV_MS   = parseFloat(cssRoot.getPropertyValue('--nav-t')) * 1000;
const EASE_OUT = cssRoot.getPropertyValue('--nav-ease').trim();

/* ═══ 1 Wortmarke: bildschirmbreit auf dem Start, schrumpft links oben
   in die Kopfleiste (30 px). Ohne JS steht sie gleich klein dort. ═══ */
let TOP = 10.5;                                   // Abstand der kleinen Wortmarke von oben (CSS --bar-pad)
let big = 1, slotTop = 0, travel = 1, padX = 0, markW = 0, ledeTop = 0, ledeH = 0, ledeEnd = 0, barH = 58;

/* Echte Schrift-Transition: die Schriftgröße selbst läuft mit (nicht transform:scale).
   Der Browser setzt die Buchstaben bei jeder Größe neu — scharf, ohne Umschalten. */
function measure(){
  mark.style.fontSize = '';
  mark.style.transform = 'none';
  padX = parseFloat(getComputedStyle(bar).paddingLeft);
  markW = mark.getBoundingClientRect().width;
  big = (innerWidth - 2 * padX) / markW * .97;   // Rand für Glyphenüberhang
  root.style.setProperty('--mark-w', markW + 32 + 'px');
  root.style.setProperty('--mark-w0', markW + 'px');            // volle Navigation: ↑ steht direkt hinter der Wortmarke
  mark.style.setProperty('--ix', mark.querySelector('i').offsetLeft + 'px');   // ».dev« in der Wortmarke (Schriftfarbe im Fenster)
  slot.style.height = mark.offsetHeight * big * .86 + 'px';
  slotTop = slot.offsetTop;
  travel = Math.max(1, hero.offsetHeight * .72);    // Weg bis zur Kopfleiste: endet später, wo das Gleiten schon langsamer ist
  lede.style.transform = ''; lede.style.opacity = ''; lede.style.clipPath = '';
  ledeTop = lede.offsetTop; ledeH = lede.offsetHeight;
  barH = bar.offsetHeight;                          // Höhe der Leiste (CSS --bar)
  TOP = bar.offsetTop + parseFloat(getComputedStyle(mark).top);   // Leiste kann eingerückt sein (Rechner: --pad); volle Navigation: Grundlinie wie die Einträge (CSS)
  ledeEnd = bar.offsetTop + barH + ledeH;   // ganz weg: eine eigene Höhe unter der Kopfleiste
  update(true);
}
let lastP = -1;
const onHeader = [];                          // weitere Arbeit nur, solange sich der Kopf bewegt (nicht bei jedem Scrollen)
function update(force){
  const p = Math.min(1, Math.max(0, Y() / travel));
  if (p === lastP && !force) return;          // nach dem Startbildschirm: nichts mehr zu tun, kein Neuberechnen der Seite
  lastP = p;
  // EIN Bogen: die Mitte der Marke läuft auf einer quadratischen Bézierkurve
  // von der Mitte der großen Marke zur Mitte der kleinen. Der Kontrollpunkt liegt
  // auf Höhe des Starts und über dem Ziel — also erst nach links, dann nach oben.
  const t  = 1 - (1 - (1 - Math.cos(Math.PI * p)) / 2) ** 1.5;   // ease-in-out sine, das Ende länger ausgerollt
  const s  = big ** (1 - t);                             // Größe: logarithmisch, wirkt gleichmäßig
  const h  = 30;                                         // Zeilenhöhe der kleinen Marke
  const sx = padX + markW * big / 2, sy = slotTop + h * big / 2;   // Start (Mitte)
  const ex = padX + markW / 2,       ey = TOP + h / 2;             // Ziel (Mitte)
  const cx = ex,                     cy = sy;                      // Kontrollpunkt
  const mx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex;
  const my = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey;
  const x  = mx - markW * s / 2 - padX;                  // linke obere Ecke relativ zur Ruhelage
  const y  = my - h * s / 2 - TOP;
  mark.style.fontSize = (30 * s).toFixed(2) + 'px';
  mark.style.transform = `translate3d(${x}px,${y}px,0)`;
  root.style.setProperty('--p', t.toFixed(3));
  mark.classList.toggle('in-bar', p >= 1);          // erst in der Leiste reagiert die Wortmarke auf das Fenster
  // Leiste/Navigation: kommen im selben Tempo herunter, in dem die Wortmarke das letzte Stück (eine
  // Leistenhöhe) hinaufsteigt — sie beginnen kurz vor dem Ende und sind mit ihr zugleich am Ziel
  root.style.setProperty('--nav-y', -Math.min(Math.max(0, my - ey), bar.offsetTop + barH) + 'px');   // ganz aus dem Bild, samt Rand darüber

  // Unterzeile: schrumpft und verblasst beim Hochscrollen; ganz weg, wenn sie noch
  // eine eigene Höhe unter der Kopfleiste steht
  const q = Math.min(1, Math.max(0, Y() / Math.max(1, ledeTop - ledeEnd)));
  // … und wo die aufsteigende Wortmarke über ihr steht, ist sie verdeckt: abgeschnitten genau an der Unterkante
  // der Buchstaben (Grundlinie ≈ 86 % der Zeile) — nie hinter dem Kopf zu sehen
  const sc = 1 - .35 * q;
  const under = (my + 30 * s * .36) - (ledeTop - Y());      // wie weit die Wortmarke in die Unterzeile reicht (px)
  lede.style.opacity = (1 - q).toFixed(3);
  lede.style.transform = `scale(${sc.toFixed(3)})`;
  lede.style.clipPath = under > 0 ? `inset(${(under / sc).toFixed(1)}px 0 0 0)` : '';
  onHeader.forEach(f => f());
}
let queued = false;
scroller.addEventListener('scroll', () => {
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; update(); });
}, { passive:true });
addEventListener('resize', measure);
document.fonts.ready.then(measure);
document.fonts.addEventListener('loadingdone', measure);   // Webfont kommt später: neu messen
measure();

/* ═══ 2 Navigation: aktives Projekt, Farbband, Fenster ═══
   Hinter der Navigation liegt ein Band aus Projekttönen (je Eintrag voll,
   über die Lücke verlaufend). Das Rechteck ist ein Ausschnitt davon und
   gleitet zum Eintrag unter der Maus, sonst zum aktiven Projekt. */
// aria-current="true" markiert den aktiven Eintrag für Vorlese-Programme (ein leerer Wert zählt als »false«)
const setCurrent = (a, on) => on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
let current = -2, hovered = null, peek = null, choice = null;   // choice: angeklickter Eintrag, solange die Seite noch unterwegs ist
let aiming = false, aimFrom = null, aimEnd = -1e9, navLater = false;  // Zielen auf Touch (3): läuft / Plätze davor / Ende

const box = a => {                           // genaue Lage eines Eintrags im Band (Bruchteile von Pixeln) — sein Ruheplatz:
  const n = hl.getBoundingClientRect(), r = a.getBoundingClientRect();   // ein laufendes Gleiten (transform) zählt nicht,
  const t = getComputedStyle(a).transform, dx = t === 'none' ? 0 : new DOMMatrix(t).m41;   // sonst landet das Fenster neben dem Eintrag
  return { l:r.left - dx - n.left, r:r.right - dx - n.left, w:n.width };
};
/* Das Band beginnt vor dem ersten Eintrag (Rechner: Fläche der Wortmarke, schmal: so breit wie der erste
   Eintrag), transparent — so hat das Fenster auch am linken Ende immer Band unter sich. */
const zeroWidth = () => narrow.matches
  ? links[0].offsetWidth
  : parseFloat(getComputedStyle(root).getPropertyValue('--mark-w')) || 160;
let navColors = null;                        // Farben der Einträge — einmal lesen; »urls« hängt vom Hell-/Dunkelmodus ab
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { navColors = null; relayout(); });   // Moduswechsel: neu lesen
function paintBand(){
  navColors = navColors || links.map(a => getComputedStyle(a).getPropertyValue('--hl'));
  const V = zeroWidth();
  hl.style.left = -V + 'px';
  hl.style.width = nav.scrollWidth + V + 'px';    // im scrollbaren Streifen: Band über die ganze Länge (+ Vorlauf vor 01)
  const f = box(links[0]);
  const stops = [`transparent 0px`, `transparent ${f.l}px`];
  links.forEach((a, j) => {
    const c = navColors[j], b = box(a);                                   // volle Projektfarbe
    stops.push(`${c} ${b.l}px`, `${c} ${b.r}px`);                          // harte Kanten, in px wie das Fenster
  });
  under.style.left = hl.style.left; under.style.width = hl.style.width;   // Linie: dasselbe Band an derselben Stelle
  if (narrow.matches) { hl.style.backgroundImage = under.style.backgroundImage = 'none'; return; }   // schmal: eine Farbe (placeHl) — wechselt sofort, beim Zielen blendet sie über (CSS)
  hl.style.backgroundColor = '';
  hl.style.backgroundImage = under.style.backgroundImage = `linear-gradient(to right, ${stops.join(',')})`;
  links.forEach(a => a.style.setProperty('--x', box(a).l + hl.offsetLeft + 'px'));   // Lage im Streifen, für die Schriftfarbe (paintText)
  paintText();
}
/* Volle Navigation: Schriftfarbe genau an den Kanten des Fensters — auch während es gleitet. Die Kanten kommen aus
   dem tatsächlich gezeichneten Ausschnitt (clip-path mitten im Übergang), daher Bild für Bild, solange er läuft. */
const fullNav = matchMedia('(min-width:1024px)');
function paintText(){
  if (!fullNav.matches) return;
  const m = getComputedStyle(hl).clipPath.match(/-?[\d.]+px/g);
  if (!m || m.length < 4) return;
  const [, R, , L] = m.map(parseFloat), x0 = hl.offsetLeft;
  bar.style.setProperty('--wl', x0 + L + 'px');                 // an der Leiste: gilt für Navigation und Wortmarke
  bar.style.setProperty('--wr', x0 + hl.offsetWidth - R + 'px');
}
let textRaf = 0;
const textLoop = () => { paintText(); textRaf = requestAnimationFrame(textLoop); };
const textStop = () => { cancelAnimationFrame(textRaf); textRaf = 0; paintText(); };
hl.addEventListener('transitionrun', () => { if (!textRaf) textRaf = requestAnimationFrame(textLoop); });
hl.addEventListener('transitionend', textStop);
hl.addEventListener('transitioncancel', textStop);
// aktiver Eintrag: angeklickt/gewählt (choice) gilt sofort, sonst die Linkseite oder das Projekt auf dem Bildschirm,
// auf dem Startbildschirm 01
function activeItem(){ return choice || (atEnd ? endLink : (linkOf(current) || linkOf(0))); }
function placeHl(){
  if (aiming) return;                            // Zielen (3): das Fenster steht fest in der Mitte
  // auf dem Startbildschirm steht das Fenster schon auf 01 — es ist da, bevor die Leiste ins Bild kommt, und
  // beim Wechsel Start → 01 bewegt sich nichts
  // voll (Rechner): Fenster auf dem aktiven Eintrag, die Linie folgt der Maus; schmal: das Fenster folgt
  const hov = hovered || peek || activeItem(), act = activeItem();
  const a = narrow.matches ? hov : act;
  links.forEach(l => l.classList.toggle('in-win', l === a));
  const b = box(a);
  hl.style.setProperty('--l', b.l + 'px');
  hl.style.setProperty('--r', b.w - b.r + 'px');
  // Linie: derselbe Ausschnitt des Bands, auf dem Eintrag unter der Maus — gleicher Takt: wo Fenster und Linie
  // übereinander stehen, haben sie genau dieselben Farben
  const u = box(narrow.matches ? act : hov);
  under.style.setProperty('--l', u.l + 'px');
  under.style.setProperty('--r', b.w - u.r + 'px');
  // schmal: Fenster in der Farbe des Eintrags, gleichzeitig mit der Schrift (CSS: kein Überblenden)
  if (narrow.matches) hl.style.backgroundColor = navColors[links.indexOf(a)];
}
function relayout(){ markNeighbours(); paintBand(); placeHl(); }
function markNeighbours(c){                   // schmal: aktiver Eintrag (oder die Mitte beim Wischen) mit seinen Nachbarn als Nummern
  if (aiming) return;
  let i = links.indexOf(c || peek || activeItem());
  if (i < 0) i = 0;                             // Startbildschirm: als stünde 01 an — nie alle Einträge zeigen
  links.forEach((a, j) => a.classList.toggle('far', Math.abs(j - i) > 1));   // je Seite eine Nummer, Telefon wie Tablet
}
// 01 ist von Anfang an aktiv (Name + Fenster + Linie) — beim Wechsel Start → 01 ändert sich nichts
setCurrent(linkOf(0), true);
markNeighbours();                               // gleich beim Laden: der Streifen startet reduziert
links.forEach(a => a.addEventListener('pointerenter', () => { hovered = a; placeHl(); }));
/* Klick: der Eintrag wird sofort aktiv — die Seite folgt. Sonst springt die Markierung beim
   Wegbewegen der Maus kurz zurück, bis die Seite angekommen ist. */
links.forEach(a => a.addEventListener('click', () => {
  choice = a === startLink ? linkOf(0) : a;       // ↑: zum Start, 01 bleibt aktiv
  if (a !== endLink) setActive(slideOf(a), true);
  relayout();
}));
nav.addEventListener('pointerleave', () => { hovered = null; placeHl(); });
// volle Navigation: die Wortmarke gehört zum Eintrag ↑ — über ihr gleitet das Fenster dorthin
mark.addEventListener('pointerenter', () => { if (!narrow.matches && lastP >= 1) { hovered = startLink; placeHl(); } });
mark.addEventListener('pointerleave', () => { if (hovered === startLink) { hovered = null; placeHl(); } });

/* Die Karte wechselt sofort (ihre Füllung beginnt); die Navigation folgt, wenn die
   Füllung zu 85 % steht — bei der Flüssigkeit auf Touch nach ≈ 390 ms. */
const NAV_AFTER_FILL = 390;
let navT = 0, fillStart = 0;                    // fillStart: Beginn der Füllung auf Touch (Zeitpunkt)
function setActive(i, now = false){           // now: Navigation sofort (Auswahl im Streifen)
  if (i === current) return;
  current = i;
  slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
  root.style.setProperty('--hl-now', i >= 0 ? getComputedStyle(slides[i]).getPropertyValue('--hl') : '');
  clearTimeout(navT);
  navT = setTimeout(showNav, now ? 0 : navDelay());
}
function showNav(){                              // Navigation auf das aktive Projekt umstellen
  if (aiming) { navLater = true; return; }       // beim Zielen: erst nach dem Loslassen
    // schmal: der aktive Eintrag steht sofort und immer mittig; ringsum bewegt sich alles im selben Takt
    // (NAV_MS, ease-out): Fenster wächst/schrumpft mittig, Farbe blendet über, Nummern gleiten an ihren neuen Platz (followCentre)
    // gab es vorher keinen aktiven Eintrag (Start → 01), steht das Fenster sofort in seiner Breite — nichts, wovon es wachsen könnte
    const hadActive = links.some(a => a.hasAttribute('aria-current'));
    const wOld = narrow.matches && hadActive ? windowWidth() : 0;
    const before = aimFrom || (wOld ? navSpots() : null); aimFrom = null;   // nach dem Zielen: von den Zielplätzen aus
    // Linkseite sichtbar: »urls« bleibt aktiv; auf dem Startbildschirm bleibt 01 stehen (Name + Fenster)
    const on = activeItem();
    links.forEach(a => setCurrent(a, a === on));
    markNeighbours();
    if (narrow.matches && !hadActive) hl.style.transition = 'none';
    relayout(); centerNav();
    if (wOld) followCentre(wOld, before);
    else if (narrow.matches) { void hl.offsetWidth; hl.style.transition = ''; }
}
function windowWidth(){                          // aktuelle Breite des Farbfensters
  return hl.getBoundingClientRect().width
    - parseFloat(hl.style.getPropertyValue('--l') || 0) - parseFloat(hl.style.getPropertyValue('--r') || 0);
}
let settleHl = 0;
const navSpots = () => links.map(a => {        // Lage und Zustand jedes Eintrags (vor dem Umschalten)
  const r = a.getBoundingClientRect();
  return { x:r.left + r.width / 2, shown:!a.classList.contains('far'), inWin:a.classList.contains('in-win') };
});
/* Schmal, nach dem Umschalten: Fenster beginnt mittig in der alten Breite und wächst/schrumpft auf den
   neuen Eintrag; Fenster- und Schriftfarbe wechseln sofort, zusammen. Keine Nummer gleitet durchs Fenster:
   der neue Eintrag steht gleich als Name darin, der bisherige beginnt direkt am Fensterrand und gleitet
   hinaus. Die übrigen gleiten von ihrem alten Platz an den neuen; wer verschwindet, verblasst zuerst,
   wer erscheint, blendet danach ein — nie zwei übereinander. Alles im selben Takt. */
function followCentre(wOld, before){
  const act = activeItem();
  links.forEach(a => a.getAnimations().forEach(x => x.cancel()));   // früheres Gleiten beenden: Ruheplätze messen
  const b = box(act), c = (b.l + b.r) / 2;
  hl.style.transition = 'none';
  hl.style.setProperty('--l', c - wOld / 2 + 'px');
  hl.style.setProperty('--r', b.w - (c + wOld / 2) + 'px');
  void hl.offsetWidth;
  hl.style.transition = '';
  placeHl();
  if (!before) return;
  const now = navSpots();
  const slot = Math.min(...now.slice(1).map((n, j) => n.x - now[j].x));   // kleinster Abstand zweier Nummern
  const r = act.getBoundingClientRect(), mid = r.left + r.width / 2;      // Fenstermitte auf dem Bildschirm
  clearTimeout(settleHl); settleHl = setTimeout(placeHl, NAV_MS + 30);   // zur Sicherheit: nach dem Gleiten noch einmal genau auf den Eintrag
  const opt = { duration:NAV_MS, easing:EASE_OUT };
  const move = dx => `translateX(${dx}px)`;
  links.forEach((a, j) => {
    if (a === act) return;                       // der neue steht sofort als Name im Fenster
    const o = before[j], n = now[j];
    let dx = o.x - n.x;
    if (o.inWin) {                               // der bisherige: beginnt außen am alten Fensterrand
      const side = Math.sign(n.x - mid) || 1, w = a.getBoundingClientRect().width;
      dx = mid + side * (wOld / 2 + w / 2) - n.x;
    }
    if (!n.shown) {                              // verschwindet: gleitet hinaus, zuerst verblasst
      if (o.shown) a.animate([{ transform:move(dx), opacity:1 }, { opacity:0, offset:.4 }, { transform:move(dx - Math.sign(dx) * slot), opacity:0 }], opt);
    } else if (!o.shown)                         // erscheint: blendet danach ein
      a.animate([{ transform:move(o.shown ? dx : Math.sign(dx) * slot), opacity:0 }, { opacity:0, offset:.4 }, { transform:'none', opacity:1 }], opt);
    else if (Math.abs(dx) > .5) a.animate([{ transform:move(dx) }, { transform:'none' }], opt);
  });
}
function navDelay(){                          // Touch: ab Beginn der Füllung gerechnet; sonst voll
  const since = performance.now() - fillStart;
  return since < 1000 ? Math.max(0, NAV_AFTER_FILL - since) : NAV_AFTER_FILL;
}

/* ═══ 3 Schmale Navigation: Auswahlrad (mittig rechts der Wortmarke) ═══
   Rad/Trackpad (und Touch mit Maus): nur Nummern, das Farbfenster folgt dem Eintrag in der Mitte;
   Loslassen: der Eintrag rastet ein, wird aktiv, zeigt seinen Namen, die Karte wechselt.
   Touch: stattdessen Zielen (unten) — der Streifen selbst lässt sich nicht schieben. */
let scrubbing = false, settleT = 0;

function centerNav(){                           // aktiven Eintrag sofort in die Mitte des Streifens
  if (!narrow.matches || scrubbing || aiming) return;
  const a = activeItem();
  if (!a) return;
  nav.scrollLeft = Math.max(0, Math.min(nav.scrollWidth - nav.clientWidth, a.offsetLeft + a.offsetWidth / 2 - nav.clientWidth / 2));
}
function centred(){                           // Eintrag, dessen Mitte der Streifenmitte am nächsten ist
  const mid = nav.getBoundingClientRect().left + nav.clientWidth / 2;
  let best = null, d = Infinity;
  links.forEach(a => { const r = a.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - mid); if (dd < d) { d = dd; best = a; } });
  return best;
}
const startScrub = () => {
  if (!narrow.matches || scrubbing) return;
  scrubbing = true; nav.classList.add('is-scrubbing');
  requestAnimationFrame(() => { peek = centred(); markNeighbours(peek); paintBand(); placeHl(); });   // nur Nummern: Band neu malen
};
if (!pagerOn) nav.addEventListener('touchstart', startScrub, { passive:true });   // Touch-Geräte ohne Maus: Zielen (unten) statt Wischen
nav.addEventListener('wheel', startScrub, { passive:true });
nav.addEventListener('touchend', () => { if (!scrubbing) return; clearTimeout(settleT); settleT = setTimeout(settle, 160); }, { passive:true });   // nur getippt: Zustand zurücksetzen
nav.addEventListener('scroll', () => {
  if (!scrubbing) return;
  const c = centred();
  if (c !== peek) { peek = c; markNeighbours(c); placeHl(); }
  clearTimeout(settleT);
  settleT = setTimeout(settle, 160);          // kurz nach dem letzten Scrollschritt gilt es als losgelassen
}, { passive:true });
function settle(){
  const a = peek; peek = null; scrubbing = false;
  nav.classList.remove('is-scrubbing');
  if (!a) return relayout();
  if (a !== endLink) setActive(slideOf(a), true);
  jumpTo(screens.indexOf(screenOf(a)));
  requestAnimationFrame(() => { relayout(); centerNav(); });
}
narrow.addEventListener('change', () => { fitNav(); relayout(); centerNav(); });

/* Touch, schmal: Zielen. Finger auf den aktiven Eintrag: das Farbfenster in der Mitte wächst auf die Breite
   des längsten Namens, alle Nummern erscheinen links und rechts davon. Seitlich ziehen: die Nummern gleiten
   unter dem feststehenden Fenster durch, das Fenster zeigt Name und Farbe des Projekts darin.
   Loslassen: das Fenster schrumpft auf den gewählten Namen, die Seite gleitet dorthin (nur getippt: bleibt). */
if (pagerOn) {
  let f = 0, f0 = 0, x0 = 0, from = 0, pid = null, touched = null, dragged = false, gap = 26, W = 0, widths = [], aimed = -1;
  const place = () => {                          // Lage aller Einträge für die Zielstellung f (Bruchteil)
    const c = nav.clientWidth / 2;
    const k = Math.max(0, Math.min(links.length - 1, Math.round(f)));
    if (k !== aimed) {
      aimed = k;
      links.forEach((a, j) => { a.classList.toggle('aim', j === k); a.classList.toggle('in-win', j === k); });
      hl.style.backgroundColor = navColors[k];
      widths = links.map(a => a.offsetWidth);
    }
    links.forEach((a, j) => {
      const d = j - f;
      // neben dem Fenster je eine Nummer pro gap; keine Nummer ragt ins Fenster: die kommende hält am Rand
      // und springt beim Wechsel direkt als Name hinein — gleich in Fenster- und Schriftfarbe
      const x = j === k ? c : c + Math.sign(d) * (W / 2 + gap / 2) + (d - Math.sign(d) / 2) * gap;
      a.style.transform = `translateX(${x - widths[j] / 2}px)`;
    });
  };
  const start = (a, ev) => {                     // a: der aktive Eintrag — Ausgangspunkt, egal wo der Finger liegt
    const spots = navSpots();
    aiming = true; aimed = -1; dragged = false;
    from = f = f0 = links.indexOf(a); x0 = ev.clientX;
    // Streifen auf den Anfang: das Fenster gleitet mit dem Inhalt mit — ausgleichen, damit es auf dem Bildschirm
    // stehen bleibt und von dort aus mittig wächst (sonst springt es erst zur Seite und kommt zurück)
    const sOld = nav.scrollLeft;
    nav.scrollLeft = 0;
    if (sOld) {
      hl.style.transition = 'none';
      hl.style.setProperty('--l', parseFloat(hl.style.getPropertyValue('--l')) - sOld + 'px');
      hl.style.setProperty('--r', parseFloat(hl.style.getPropertyValue('--r')) + sOld + 'px');
      void hl.offsetWidth;
      hl.style.transition = '';
    }
    nav.classList.add('is-aiming');
    const probe = links.find(l => l !== a) || a;
    gap = probe.offsetWidth;                     // Abstand zweier Nummern (Nummer + Innenabstand)
    nav.classList.add('aim-measure');           // alle Namen kurz ausgeklappt messen
    W = Math.max(...links.map(l => l.offsetWidth));
    nav.classList.remove('aim-measure');
    place();
    // Fenster: mittig, so breit wie der längste Name — gleitet aus seiner bisherigen Breite dorthin
    const cx = nav.scrollLeft + nav.clientWidth / 2 - hl.offsetLeft;   // Streifenmitte im Band (Layoutwerte, nicht vom Bildlauf abhängig)
    hl.style.setProperty('--l', cx - W / 2 + 'px');
    hl.style.setProperty('--r', hl.offsetWidth - (cx + W / 2) + 'px');
    // Nummern gleiten von ihren alten Plätzen an die neuen (zusätzlich zur Zielstellung, die dem Finger folgt)
    const now = navSpots();
    links.forEach((l, j) => {
      const dx = spots[j].x - now[j].x;
      if (Math.abs(dx) > .5) l.animate([{ transform:`translateX(${dx}px)` }, { transform:'translateX(0)' }], { duration:NAV_MS, easing:EASE_OUT, composite:'add' });
    });
  };
  const finish = () => {
    // nur getippt (nicht gezogen) auf einen Nachbarn: der wird gewählt
    const j = !dragged && touched && links.includes(touched) ? links.indexOf(touched) : aimed;
    const before = navSpots(), wOld = W;
    links.forEach(a => a.getAnimations().forEach(x => x.cancel()));   // Einblenden des Zielens, falls noch unterwegs
    aiming = false; aimEnd = performance.now();
    nav.classList.remove('is-aiming');
    links.forEach(a => { a.style.transform = ''; a.classList.remove('aim'); });
    const later = navLater; navLater = false;
    aimFrom = before;
    if (j === from) {                            // nichts gewählt: Fenster schrumpft zurück, Nummern an ihre Plätze
      if (later) return showNav();               // die Seite hat inzwischen gewechselt
      aimFrom = null; relayout(); centerNav(); followCentre(wOld, before);
      return;
    }
    const el = screenOf(links[j]);
    if (el === endPage) {                        // »urls«: sofort aktiv wie ein Projekt — nicht erst, wenn die Linkseite halb im Bild ist
      choice = endLink; aimFrom = null;
      links.forEach(a => setCurrent(a, a === endLink));
      relayout(); centerNav(); followCentre(wOld, before);
    }
    else if (current === slideOf(links[j])) showNav(); else setActive(slideOf(links[j]), true);   // ↑: −1 → 01 aktiv
    jumpTo(screens.indexOf(el));
  };
  nav.addEventListener('pointerdown', ev => {
    // Finger irgendwo auf dem Streifen: Zielen vom aktiven Eintrag aus — das Fenster verhält sich immer gleich
    if (!narrow.matches || aiming) return;
    pid = ev.pointerId; touched = ev.target.closest('a');
    start(activeItem(), ev);
  });
  nav.addEventListener('pointermove', ev => {    // der Finger bleibt am Eintrag gefangen
    if (!aiming || ev.pointerId !== pid) return;   // nur der Finger, der begonnen hat
    if (Math.abs(ev.clientX - x0) > 8) dragged = true;
    f = Math.max(0, Math.min(links.length - 1, f0 - (ev.clientX - x0) / gap));
    place();
  });
  nav.addEventListener('pointerup', ev => { if (aiming && ev.pointerId === pid) finish(); });
  nav.addEventListener('pointercancel', ev => { if (aiming && ev.pointerId === pid) { f = f0; place(); finish(); } });
  nav.addEventListener('click', ev => {         // Klick nach dem Zielen: nichts weiter (kein Sprung zurück)
    if (performance.now() - aimEnd < 400) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);
}

/* ═══ 4 Blättern: aktives Projekt — erst übernehmen, wenn der Bildlauf steht ═══ */
let pending = null, idleT = 0;
const commit = () => { if (pending !== null) setActive(pending); pending = null; choice = null; };   // Seite steht: Klick-Wahl erledigt
const waitIdle = () => { clearTimeout(idleT); idleT = setTimeout(commit, 140); };
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  pending = slides.indexOf(en.target);        // merken, aber erst übernehmen, wenn der Bildlauf steht
  waitIdle();
}), { threshold:.5 });
scroller.addEventListener('scroll', () => { if (pending !== null) waitIdle(); }, { passive:true });
[hero, ...slides].forEach(el => io.observe(el));
/* Volle Navigation: passen nicht alle Einträge in die Breite, wird ihr Innenabstand so weit kleiner wie nötig,
   höchstens um 40 % (CSS --pk); passen sie, bleibt er, wie er ist. Vor relayout: Band und Fenster messen danach */
function fitNav(){
  nav.style.removeProperty('--pk');
  if (narrow.matches) return;
  const over = links.at(-1).getBoundingClientRect().right - nav.getBoundingClientRect().left - nav.clientWidth;   // nicht scrollWidth: das Band ragt hinaus
  if (over < 1) return;                            // Bruchteile eines Pixels: kein Bedarf
  const pad = links.filter(a => a !== startLink)
                   .reduce((n, a) => { const cs = getComputedStyle(a); return n + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight); }, 0);
  nav.style.setProperty('--pk', Math.max(.6, 1 - (over + 1) / pad));   // +1: Rundung
}
/* Rechner: Fenster endet eine Linienstärke unter der Grundlinie der Schrift, die Linie beginnt dort (CSS --base) */
function placeBase(){
  const t = links[1].querySelector('span'), p = document.createElement('i');
  p.style.cssText = 'display:inline-block;width:0;height:0';
  t.append(p);
  const y = p.getBoundingClientRect().top; p.remove();
  const n = nav.getBoundingClientRect().top;
  const d = y + parseFloat(getComputedStyle(root).getPropertyValue('--nav-line'));   // eine Linienstärke unter der Grundlinie
  nav.style.setProperty('--base', (d - n).toFixed(1) + 'px');
}
addEventListener('resize', placeBase);
addEventListener('resize', fitNav);
addEventListener('resize', relayout);
document.fonts.ready.then(() => {
  placeBase(); fitNav(); relayout(); centerNav(); paintText();
  requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.remove('instant')));
});   // Anfangszustand: Band, Fenster, schmal 01 mittig
new ResizeObserver(relayout).observe(nav);   // Breite ändert sich (Schrift, schmale Ansicht): Band neu malen

/* ── Links/rechts wechselt das Projekt wie hoch/runter:
   Pfeiltasten, seitliches Wischen am Trackpad, Wischen am Touchscreen ═══ */
new IntersectionObserver(([en]) => {
  if (!en.isIntersecting && choice === endLink) choice = null;   // Linkseite verlassen: die Wahl »urls« ist erledigt
  if (en.isIntersecting === atEnd) return;
  if (aiming) { atEnd = en.isIntersecting; root.classList.toggle('at-end', atEnd); navLater = true; return; }   // beim Zielen: nach dem Loslassen
  const wOld = narrow.matches ? windowWidth() : 0, before = wOld ? navSpots() : null;
  atEnd = en.isIntersecting;
  root.classList.toggle('at-end', atEnd);
  setCurrent(endLink, atEnd);
  links.forEach(a => { if (a !== endLink) setCurrent(a, !atEnd && a === (linkOf(current) || linkOf(0))); });
  relayout(); centerNav();
  if (wOld) followCentre(wOld, before);
}, { threshold:.5 }).observe(endPage);

/* ── Blättern mit Rad, Trackpad, Tasten (Rechner) ──
   Eine Geste = eine Karte. Der Bildlauf übernimmt das Tempo der Geste (wie das Wischen auf dem
   Telefon): ease-out cubic mit T = 3·Weg / Tempo, weich auf die Kartenkante — 0,3 bis 0,65 s,
   Start ↔ 01 bis 1,05 s (die Wortmarke braucht Zeit für ihren Bogen). Nachschwung wird geschluckt. */
let gliding = false, lastWheel = -1e9;       // -1e9: noch nie — sonst ignoriert die Seite Rad und Klicks in den ersten 180–400 ms nach dem Laden
const easeOutC = k => 1 - (1 - k) ** 3;
/* Touch: die Füllung der Zielkarte beginnt 0,33 s vor dem Ende des Gleitens (Flüssigkeit, 7) */
const FILL_AHEAD = 330;
let fillAhead = () => {}, aheadT = 0;
const fillBefore = (i, dur) => { clearTimeout(aheadT); aheadT = setTimeout(() => fillAhead(screens[i]), Math.max(0, dur - FILL_AHEAD)); };
let glideTouch = null;                           // Touch: Gleiten im .pager (siehe unten)
function glide(to, dur, i){                      // i: Zielbildschirm (für den Kopf der Zahl)
  if (calm.matches) return toY(to);              // reduzierte Bewegung: sofort an der Kante
  const from = Y(), t0 = performance.now();
  gliding = true;
  snapEl.style.scrollSnapType = 'none'; snapEl.style.scrollBehavior = 'auto';
  const tick = now => {
    const k = Math.min(1, (now - t0) / dur);
    toY(from + (to - from) * easeOutC(k));
    if (k < 1) return requestAnimationFrame(tick);
    snapEl.style.scrollSnapType = ''; snapEl.style.scrollBehavior = '';
    gliding = false;
    clearTimeout(idleT); commit();               // Karte steht: Fenster sofort, ohne auf die Scroll-Ruhe zu warten
  };
  requestAnimationFrame(tick);
}
const here = () => {                             // Bildschirm, dessen Anfang der Scrollposition am nächsten ist
  const y = Y(); let b = 0;
  screens.forEach((el, i) => { if (Math.abs(el.offsetTop - y) < Math.abs(screens[b].offsetTop - y)) b = i; });
  return b;
};
function go(dir, speed = 0){                     // speed: Tempo der Geste in px/ms (0 = unbekannt)
  if (gliding) return;
  const from = here(), i = Math.max(0, Math.min(screens.length - 1, from + dir));
  const max = pagerOn ? pager.scrollHeight - pager.clientHeight : root.scrollHeight - innerHeight;
  const to = Math.min(screens[i].offsetTop, max);   // Touch: Höhe des .pager, nicht der Seite (sonst immer ganz nach oben)
  const d = Math.abs(to - Y());
  if (d < 1) return;
  const most = (from <= 1 && i <= 1) ? (pagerOn ? 900 : 1050) : (pagerOn ? 520 : 650);
  if (pagerOn) return glideTouch(to, most, i);
  glide(to, speed > 0 ? Math.min(most, Math.max(300, 3 * d / speed)) : most, i);
}
/* Ferne Ziele (Navigation, Zielen, Links): nur die aktuelle Karte gleitet hinaus und das Ziel direkt hinterher
   herein — eine Kartenlänge, wie beim Blättern; die Karten dazwischen erscheinen nie. Die Seite springt sofort
   zum Ziel; ein Abbild der aktuellen Karte gleitet darüber hinaus, der Inhalt vom Ziel aus hinterher.
   Zum Startbildschirm: von 01 aus gleiten, damit die Wortmarke ihren Bogen fährt. */
function jumpTo(i){
  const from = here();
  if (i < 0 || i === from) return;
  const max = pagerOn ? pager.scrollHeight - pager.clientHeight : root.scrollHeight - innerHeight;
  const at = j => Math.min(screens[j].offsetTop, max);
  const glideTo = (j, dur) => pagerOn ? glideTouch(at(j), dur, j) : glide(at(j), dur, j);
  if (Math.abs(i - from) <= 1 || calm.matches || i === 0) {      // Nachbar, reduzierte Bewegung oder Start: wie gewohnt
    if (Math.abs(i - from) > 1) toY(at(1));
    return glideTo(i, Math.min(i, from) === 0 || i === 0 ? (pagerOn ? 900 : 1050) : (pagerOn ? 520 : 650));
  }
  const dir = Math.sign(i - from), dur = pagerOn ? 520 : 650, vh = pagerOn ? pager.clientHeight : innerHeight;
  const cur = screens[from], r = cur.getBoundingClientRect(), content = pager;   // .pager umfasst alle Bildschirme (auch die Linkseite)
  const ghost = cur.cloneNode(true);                             // Abbild der aktuellen Karte, fest an ihrem Platz
  ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true');
  ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:5;pointer-events:none`;
  document.body.append(ghost);
  gliding = true;
  snapEl.style.scrollSnapType = 'none';                          // sonst rastet die verschobene Seite neu ein
  toY(at(i));                                                    // die Seite steht sofort am Ziel …
  if (pagerOn) fillBefore(i, dur);
  const t0 = performance.now();
  const tick = now => {                                          // … Abbild hinaus, Inhalt hinterher (ease-out, eine Kartenlänge)
    const k = Math.min(1, (now - t0) / dur), e = easeOutC(k);
    ghost.style.transform = `translateY(${-dir * vh * e}px)`;
    content.style.transform = `translateY(${dir * vh * (1 - e)}px)`;
    if (k < 1) return requestAnimationFrame(tick);
    ghost.remove(); content.style.transform = '';
    snapEl.style.scrollSnapType = ''; gliding = false;
    clearTimeout(idleT); commit();
  };
  content.style.transform = `translateY(${dir * vh}px)`;
  requestAnimationFrame(tick);
}
addEventListener('keydown', ev => {
  if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.target.closest('input, textarea')) return;
  const k = ev.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { ev.preventDefault(); go(1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k))          { ev.preventDefault(); go(-1); }
});
/* Vollbild wie eine Präsentation: Taste F, Doppelklick/-tipp auf den Hintergrund (nicht auf Karten, Links, Leiste)
   oder der Knopf »F« links oben (nur mit Maus). iPhone kann es nicht — dort: zum Home-Bildschirm hinzufügen. */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
function toggleFullscreen(){
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
}
if (fsOk) {
  const fsBtn = document.querySelector('.fs');
  fsBtn.hidden = false;
  fsBtn.addEventListener('click', toggleFullscreen);
  // unter der Maus: »F« gleitet von da, wo es gerade ist, in die Mitte (ease-out); danach läuft es von der Mitte aus weiter
  const fsF = fsBtn.querySelector('span');
  fsBtn.addEventListener('mouseenter', () => {
    if (calm.matches) return;
    const cs = getComputedStyle(fsF);
    fsF.style.left = cs.left; fsF.style.top = cs.top;   // Ort im Lauf festhalten …
    fsF.classList.add('centred'); fsF.offsetWidth;
    fsF.style.left = 'calc(50% - .23em)'; fsF.style.top = 'calc(50% - .3485em)';   // … und von dort zur Mitte
  });
  fsBtn.addEventListener('mouseleave', () => {
    if (!fsF.classList.contains('centred')) return;
    fsF.classList.remove('centred'); fsF.style.left = fsF.style.top = '';
    fsF.style.animationDelay = '-2.15s, -1.55s';   // je halbe Laufzeit (4,3 s / 3,1 s): der Lauf beginnt in der Mitte
  });
  addEventListener('keydown', ev => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.target.closest('input, textarea')) return;
    if (ev.key === 'f' || ev.key === 'F') { ev.preventDefault(); toggleFullscreen(); }
  });
  const onBg = ev => !ev.target.closest('.card, a, button, .bar');
  if (!pagerOn) addEventListener('dblclick', ev => { if (onBg(ev)) toggleFullscreen(); });
  else {                                        // Touch: Doppeltipp selbst erkennen (iOS meldet kein verlässliches dblclick)
    let lastBgTap = 0;
    addEventListener('click', ev => {
      if (!onBg(ev)) return;
      const now = performance.now();
      if (now - lastBgTap < 300) { lastBgTap = 0; toggleFullscreen(); } else lastBgTap = now;
    });
  }
}

if (!pagerOn) addEventListener('wheel', ev => { // senkrecht: jede Geste eine Karte, im Tempo der Geste
  if (ev.ctrlKey || ev.metaKey) return;          // Zoomen (Strg/Cmd + Rad, Trackpad-Zweifingerzoom) bleibt dem Browser
  if (ev.target.closest && ev.target.closest('.nav')) return;
  if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
  ev.preventDefault();
  const now = performance.now(), quiet = now - lastWheel > 180;
  lastWheel = now;
  if (gliding || !quiet) return;                // Nachschwung / laufende Geste
  const px = Math.abs(ev.deltaY) * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? innerHeight : 1);
  go(Math.sign(ev.deltaY), px / 16);            // ≈ ein Rad-Ereignis pro Bild (16 ms)
}, { passive:false });
document.querySelector('.cue a').addEventListener('click', ev => { ev.preventDefault(); go(1); });
let wheelLock = 0;
addEventListener('wheel', ev => {
  if (ev.ctrlKey || ev.metaKey) return;
  if (ev.target.closest && ev.target.closest('.nav')) return;   // der Streifen scrollt selbst
  if (Math.abs(ev.deltaX) < 30 || Math.abs(ev.deltaX) < Math.abs(ev.deltaY) * 1.5) return;
  const now = Date.now();
  if (now < wheelLock) return;                // eine Geste = ein Projekt
  wheelLock = now + 700;
  go(ev.deltaX > 0 ? 1 : -1);
}, { passive:true });
let touch = null;
addEventListener('touchstart', ev => { if (ev.target.closest('.nav')) { touch = null; return; } const t = ev.touches[0]; touch = { x:t.clientX, y:t.clientY }; }, { passive:true });
addEventListener('touchend', ev => {
  if (!touch) return;
  const t = ev.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
}, { passive:true });

/* ── Touch: Einrasten per Skript ──
   Finger führt 1:1; beim Loslassen entscheidet die Wischbewegung: schnell oder mehr als ¼ Bildschirm
   = eine Karte weiter/zurück, sonst zurück zur aktuellen. Dann wird der iOS-Schwung gestoppt und die
   Seite gleitet exakt auf die Kartenkante. Karten höher als der Bildschirm lassen sich innen frei scrollen. */
if (pagerOn) {
  const tops = () => screens.map(el => el.offsetTop);
  const maxY = () => pager.scrollHeight - pager.clientHeight;
  let startY = 0, samples = [], anim = 0, x0 = 0, y0 = 0;
  const screenAt = y => { const t = tops(); let i = 0; while (i + 1 < t.length && t[i + 1] <= y + 2) i++; return i; };   // Bildschirm, in dem y liegt
  function glideTo(to, dur, i){                   // ease-out cubic (easeOutC): Anfangstempo 3·Weg/Dauer, am Ende 0; i: Zielbildschirm
    cancelAnimationFrame(anim);
    const from = pager.scrollTop, d = to - from;
    if (Math.abs(d) < 1 || calm.matches) { pager.scrollTop = to; pager.style.overflowY = ''; return; }
    fillBefore(i, dur);
    pager.style.overflowY = 'hidden';                  // stoppt den iOS-Schwung
    const t0 = performance.now();
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      pager.scrollTop = from + d * easeOutC(k);
      if (k < 1) anim = requestAnimationFrame(tick); else pager.style.overflowY = '';
    };
    anim = requestAnimationFrame(tick);
  }
  glideTouch = glideTo;
  pager.addEventListener('touchstart', ev => {
    cancelAnimationFrame(anim); clearTimeout(aheadT); pager.style.overflowY = '';
    startY = pager.scrollTop;
    x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
    samples = [{ y:y0, t:performance.now() }];
  }, { passive:true });
  pager.addEventListener('touchmove', ev => {
    const now = performance.now();
    samples.push({ y:ev.touches[0].clientY, t:now });
    while (samples.length > 2 && now - samples[0].t > 90) samples.shift();   // nur die letzten ~90 ms zählen
  }, { passive:true });
  pager.addEventListener('touchend', ev => {
    const f = ev.changedTouches[0], dx = f.clientX - x0, dy = f.clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) return;   // seitliche Geste: die blättert (4), nicht hier einrasten
    const a = samples[0], b = samples[samples.length - 1];
    const v = b && a && b.t > a.t ? (a.y - b.y) / (b.t - a.t) : 0;   // px/ms, positiv = nach unten blättern
    const y = pager.scrollTop, vh = pager.clientHeight, t = tops();
    const i = screenAt(startY), h = (t[i + 1] ?? pager.scrollHeight) - t[i];
    // hohe Karte: innen frei scrollen, solange wir nicht über ihre Enden hinaus wollen
    if (h > vh + 4 && y > t[i] && y < t[i] + h - vh) return;
    let target = i;
    if (Math.abs(v) > .35) target = i + Math.sign(v);
    else if (Math.abs(y - startY) > vh / 4) target = i + Math.sign(y - startY);
    target = Math.max(0, Math.min(screens.length - 1, target));
    // hohe Karte beim Hochwischen: an ihrem unteren Ende landen, nicht am Anfang
    let to = t[target];
    if (target < i || (target === i && y < t[i])) {
      const ht = (t[target + 1] ?? pager.scrollHeight) - t[target];
      if (ht > vh + 4 && target < i) to = t[target] + ht - vh;
    }
    const y2 = Math.max(0, Math.min(maxY(), to)), d = y2 - pager.scrollTop;
    // Die Karte nimmt die Geschwindigkeit des Fingers mit (wie bei den afterworkphotos-Karten):
    // ease-out cubic startet mit 3·d/T — also T = 3·|d| / v, dann weich auf die Kante.
    // Schneller Wisch landet schnell, langsamer langsam; mindestens 0,25 s, höchstens 0,52 s
    // (Start ↔ 01: bis 0,9 s, die Wortmarke braucht Zeit für ihren Bogen).
    const most = (i === 0 && target === 1) || (i === 1 && target === 0) ? 900 : 520;
    const v0 = Math.sign(v) === Math.sign(d) ? Math.abs(v) : 0;
    glideTo(y2, v0 > 0 ? Math.min(most, Math.max(250, 3 * Math.abs(d) / v0)) : most, target);
  }, { passive:true });
}

/* ── Seiteninterne Links (#…) gleiten per Skript — auf Touch gilt kein globales »smooth« ── */
document.addEventListener('click', ev => {
  const a = ev.target.closest('a[href^="#"]');
  if (!a || ev.defaultPrevented) return;
  let id = a.getAttribute('href').slice(1);       // getElementById statt querySelector: Kennungen mit Ziffer/Punkt (3d-viz, v1.2) und href="#" lösen keinen Fehler aus
  try { id = decodeURIComponent(id); } catch (e) { return; }   // kaputte %-Folge: der Browser macht es wie gewohnt
  const t = id && document.getElementById(id);
  if (!t) return;
  ev.preventDefault();
  if (screens.includes(t)) jumpTo(screens.indexOf(t));    // Bildschirm (Start, Projekt, Linkseite): höchstens eine Karte Weg sichtbar
  else t.scrollIntoView({ behavior:calm.matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', a.getAttribute('href'));
});

/* Jede Karte passt in den Bildschirm, auch mit mehr Projekten: ist sie zu hoch oder ein Wort breiter als die Karte,
   wird ihre Schrift (Titel, Unterzeile; Linkseite: Überschrift und Links) so weit kleiner, wie nötig (CSS --fit) */
const fitWide = s => s === endPage ? [s.querySelector('.links')] : [...s.querySelectorAll('.title, .tagline')];
function fitCards(){
  const room = (pagerOn ? pager.clientHeight : innerHeight) + .5;
  [...slides, endPage].forEach(s => {
    const c = s.querySelector('.card'), cs = getComputedStyle(c);
    c.style.removeProperty('--fit');
    const wide = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1;   // +1: Rundung
    const fits = () => s.offsetHeight <= room && fitWide(s).every(e => e.scrollWidth <= wide);   // Titel/Links wachsen mit dem breitesten Wort
    if (fits()) return;
    let lo = .1, hi = 1;                              // größte Stufe, die passt
    for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; c.style.setProperty('--fit', m); fits() ? lo = m : hi = m; }
    c.style.setProperty('--fit', lo);
  });
}
addEventListener('resize', fitCards);
document.fonts.ready.then(fitCards);
fitCards();

/* Kopf der großen Zahl auf der Karte (CSS .num-top): eine Kopie der Zahl je Karte, genau auf ihr, über der Leiste.
   Sichtbar ist nur, was über die Kartenkante ragt; ob sie zu sehen ist, entscheidet allein die Scrollposition (CSS):
   ruhend oder nach unten gezogen ja, nach oben unter die Leiste nein. Hier nur die Lage, einmal je Größe. */
const numTops = [...document.querySelectorAll('.slide .num')].map(n => {
  const c = n.cloneNode(true); c.className = 'num-top'; c.setAttribute('aria-hidden', 'true');
  n.closest('.slide').append(c);
  return [n, c];
});
function placeNumTops(){
  numTops.forEach(([n, c]) => {
    c.style.transform = '';
    const r = n.getBoundingClientRect(), q = c.getBoundingClientRect();
    c.style.transform = `translate(${(r.left - q.left).toFixed(1)}px,${(r.top - q.top).toFixed(1)}px)`;
  });
}
addEventListener('resize', placeNumTops);
document.fonts.ready.then(placeNumTops);
placeNumTops();

/* Unterzeile beginnt genau unter dem ersten Buchstaben des Titels: der große Titel hat mehr Vorbreite (5–11 px je
   nach Buchstabe) — je Karte gemessen und die Unterzeile um den Unterschied eingerückt */
const inkCanvas = document.createElement('canvas').getContext('2d');
function inkLeft(el){                                // Bildschirm-x der Tinte des ersten Buchstabens
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode:n => n.textContent.trim() ? 1 : 3 });
  const tn = walk.nextNode(); if (!tn) return null;
  const i = tn.textContent.search(/\S/), rg = document.createRange();
  rg.setStart(tn, i); rg.setEnd(tn, i + 1);
  const cs = getComputedStyle(tn.parentElement);
  inkCanvas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return rg.getBoundingClientRect().left - inkCanvas.measureText(tn.textContent[i]).actualBoundingBoxLeft;
}
function alignSublines(){
  document.querySelectorAll('.slide .card').forEach(c => {
    const t = c.querySelector('.title'), s = c.querySelector('.tagline'); if (!t || !s) return;
    s.style.marginLeft = '';
    const a = inkLeft(t), b = inkLeft(s);
    if (a !== null && b !== null) s.style.marginLeft = Math.max(0, a - b).toFixed(1) + 'px';
  });
}
addEventListener('resize', alignSublines);
document.fonts.ready.then(alignSublines);
alignSublines();

/* ═══ 5 Projektbild und Details
   Klick/Tipp: leere Karte → Raster → volles Bild → leere Karte. Zurück zur leeren Karte 8 s nach dem letzten Klick
   (langsam, 4 s), beim Wegblättern oder mit einem Klick außerhalb der Karte.
   Alle Bilder werden nach dem Laden der Seite vorab geladen und gerastert.
   Ganz aus dem Bild geblättert: Bild aus, offenes Detail zu — die Karte kommt leer zurück. ═══ */
const SHOW_FOR = 8000;                      // so lange nach dem letzten Klick, dann blendet das Bild aus

/* Halbton im Browser: Punkte auf gedrehtem Raster (45°), Fläche ∝ Dunkelheit.
   Gezeichnet für die echte Kartengröße und Pixeldichte — scharf, ohne eigene Dateien. */
function halftone(canvas, img){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);       // wie background-size:cover
  const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
  const cell = 12.8 * dw / 1600;                                          // Rasterweite wie bisher
  // Vorlage klein, weich und grau abtasten
  const k = 4 / cell, sw = Math.ceil(w * k), sh = Math.ceil(h * k);
  const src = document.createElement('canvas'); src.width = sw; src.height = sh;
  const sx = src.getContext('2d', { willReadFrequently:true });
  sx.filter = `blur(${(cell / 3 * k).toFixed(2)}px) grayscale(1)`;
  sx.drawImage(img, (w - dw) / 2 * k, (h - dh) / 2 * k, dw * k, dh * k);
  const px = sx.getImageData(0, 0, sw, sh).data;
  // Kontrast strecken (1 % abschneiden), überwiegend dunkle Bilder umkehren
  const hist = new Uint32Array(256); let sum = 0;
  for (let i = 0; i < px.length; i += 4) { hist[px[i]]++; sum += px[i]; }
  const n = px.length / 4, cut = n * .01;
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < cut) lo++;
  acc = 0; while (hi > 0 && (acc += hist[hi]) < cut) hi--;
  const span = Math.max(1, hi - lo);
  const inv = (sum / n - lo) / span * 255 < 100;
  const lum = (x, y) => {
    const i = (Math.min(sh - 1, Math.max(0, y | 0)) * sw + Math.min(sw - 1, Math.max(0, x | 0))) * 4;
    const g = Math.min(255, Math.max(0, (px[i] - lo) / span * 255));
    return inv ? 255 - g : g;
  };
  // Punkte zeichnen
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const cx = canvas.getContext('2d');
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.fillStyle = '#000'; cx.beginPath();
  const a = Math.PI / 4, ux = Math.cos(a) * cell, uy = Math.sin(a) * cell;
  const m = Math.ceil(Math.hypot(w, h) / cell) + 2, rmax = cell * .72, rmin = .9 * dw / 1600;
  for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) {
    const x = w / 2 + i * ux - j * uy, y = h / 2 + i * uy + j * ux;
    if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
    const dark = Math.max(0, (1 - lum(x * k, y * k) / 255 - .1) / .9) ** .8;
    const r = rmax * Math.sqrt(dark);
    if (r < rmin) continue;
    cx.moveTo(x + r, y); cx.arc(x, y, r, 0, Math.PI * 2);
  }
  cx.fill();
  canvas.dataset.size = w + 'x' + h;
}

/* Touch: ein Tipp vergrößert ein Detail (Technik); solange eines groß ist, schließt der nächste
   Tipp — wo auch immer — nur dieses Detail und löst sonst nichts aus (kein Raster, kein Link). */
let openD = null;
const closeD = () => { if (openD) openD.classList.remove('on'); openD = null; };
if (pagerOn) document.addEventListener('click', ev => {
  const d = ev.target.closest('.meta .d');
  if (!openD && !d) return;
  ev.preventDefault(); ev.stopPropagation();
  if (openD) closeD();
  else { d.classList.add('on'); openD = d; }
}, true);
const onAway = new Map();                    // Karte → Zurücksetzen ihres Bildes
const away = new IntersectionObserver(es => es.forEach(en => {   // ganz weggeblättert
  if (en.isIntersecting) return;
  if (openD && en.target.contains(openD)) closeD();
  onAway.get(en.target)?.();
}));
document.querySelectorAll('.card').forEach(c => away.observe(c));

const preload = [];
addEventListener('load', () => setTimeout(() => preload.reduce((p, f) => p.then(f), Promise.resolve()), 300));   // nach dem Laden, eins nach dem anderen

document.querySelectorAll('.card[data-shot]').forEach(card => {
  let hideTimer, mode = null;     // null | 'shot' | 'full'
  const canvas = card.querySelector('canvas.shot');
  let img = null;
  const load = () => {                        // erst bei Kontakt mit der Karte laden
    if (!img) {
      img = new Image();
      img.src = card.dataset.shot;
      card.style.setProperty('--full', `url(${card.dataset.shot})`);
    }
    return img.decode().catch(() => {});
  };
  const draw = () => load().then(() => {
    if (img.naturalWidth && canvas.dataset.size !== canvas.clientWidth + 'x' + canvas.clientHeight) halftone(canvas, img);
  });
  preload.push(draw);                          // alle Bilder vorab laden und rastern: kein Warten beim Blättern
  addEventListener('resize', () => { if (canvas.dataset.size) { delete canvas.dataset.size; if (mode) draw(); } });
  const at = ev => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--cx', ev.clientX - r.left + 'px');
    card.style.setProperty('--cy', ev.clientY - r.top + 'px');
  };
  const arm = () => {                         // Uhr neu starten: 8 s nach dem letzten Klick ausblenden
    clearTimeout(hideTimer);
    if (mode) hideTimer = setTimeout(() => show(null, true), SHOW_FOR);
  };
  const show = (m, slow = false) => {         // slow: nach Ablauf langsam ausblenden, sonst zügig
    if (m) draw();
    card.classList.toggle('slow-out', slow);
    mode = m;
    card.classList.toggle('is-shot', m === 'shot');
    card.classList.toggle('is-full', m === 'full');
    arm();
  };
  onAway.set(card, () => { if (mode) show(null); });
  document.addEventListener('click', ev => { if (mode && !card.contains(ev.target)) show(null); });   // Klick außerhalb der Karte
  card.addEventListener('mousedown', ev => { if (ev.detail > 1 && !ev.target.closest('a')) ev.preventDefault(); });   // kein Markieren bei schnellen Klicks
  // Touch: ein Tipp auf ein Detail (Technik) vergrößert nur das Detail — kein Tipp auf die Karte
  const ignore = ev => ev.target.closest('a') || (pagerOn && ev.target.closest('.meta .d'));
  card.addEventListener('click', ev => {
    if (ignore(ev)) return;
    at(ev);                                    // volles Bild öffnet sich vom Cursor/Finger aus und schließt sich dorthin
    show(mode === null ? 'shot' : mode === 'shot' ? 'full' : null);
  });
});

/* ═══ 6 Link-Pille beim Verlassen: Kopie fährt nach links hinaus ═══ */
document.querySelectorAll('.title a, .links a').forEach(a => {
  const leave = () => {
    if (calm.matches) return;
    const g = document.createElement('span');
    g.className = 'pill-ghost';
    g.setAttribute('aria-hidden', 'true');
    a.append(g);
    g.animate([{ transform:'none' }, { transform:'translateX(-100vw)' }],
              { duration:367, easing:'cubic-bezier(.55,0,.9,.35)' }).onfinish = () => g.remove();
  };
  /* Nach 1,2 s Hover läuft 4,8 s lang EINE Welle über die ganze Oberkante der Pille: kein Abschnitt mit eigenem Anfang und Ende,
     sondern eine durchgehende, sinusförmige Welle (eine Kuppe, eine Mulde; die Kuppe höchstens ≈ 38 % der Breite), die mit
     seitlich wandert, mit weich wechselndem Tempo (nie null) — sie steht nie still. Sie wächst weich aus der Linie, schwillt und
     flacht wieder zur sauberen Linie ab. Mit 50 % Wahrscheinlichkeit läuft eine zweite, kleinere Welle mit anderem Tempo in Gegenrichtung
     mit und überlagert sich. Alle Zeitkurven (Wachsen, Abklingen) und die Ortskurve an den Enden sind G3 (Fenster mit verschwindender
     1.–3. Ableitung, kein Überschwingen); an den Pillenenden läuft die Welle nur dadurch aus. Nie enger gekrümmt als die Pillenenden
     (Radius r). Die Pille bekommt oben Luft (--liq-up) und wird als Pfad beschnitten (--liq, px) mit denselben Ecken wie sonst.
     Nur mit Maus, nicht bei reduzierter Bewegung. */
  const LIQ_AFTER = 1200, LIQ_DUR = 4.8, LIQ_N = 64, LIQ_AMP = .16;       // Beginn nach 1,2 s Hover, die Bewegung dauert 4,8 s; Höhe: Anteil der Pillenhöhe
  const LIQ_LAMBDA = .75, LIQ_SPEED = .038;                             // Wellenlänge (Anteil der Pillenbreite) und Grundtempo (Breiten je Sekunde; schwillt auf bis ×1,6)
  const smooth7 = k => (k = Math.min(1, Math.max(0, k)), k ** 4 * (35 - 84 * k + 70 * k * k - 20 * k ** 3));   // 0→1, Ableitungen 1–3 an beiden Enden 0
  let liqTimer = 0, liqRaf = 0;
  const liqEnd = () => {
    clearTimeout(liqTimer); cancelAnimationFrame(liqRaf); liqRaf = 0;
    ['--liq', '--liq-up', '--liq-r'].forEach(n => a.style.removeProperty(n));
  };
  const liqStart = () => {
    const fs = parseFloat(getComputedStyle(a).fontSize), W = a.clientWidth, H = a.clientHeight + .06 * fs;   // Pille: .02em über, .04em unter dem Link
    const r = Math.min(.54 * fs, W / 2), L = W - r, up = LIQ_AMP * H, base = up;                         // r: Eckenradius; L: gerade Strecke oben
    a.style.setProperty('--liq-up', up.toFixed(2) + 'px'); a.style.setProperty('--liq-r', '0');          // Ecken zeichnet der Pfad selbst
    const dir = Math.random() < .5 ? -1 : 1, two = Math.random() < .5, N = LIQ_N;
    // jede Welle: cos(2π (x − c(t)) / λ) mit c(t) = Mitte + Tempo · (t − Mitte der Bewegung): Kuppe bei c, Mulden bei c ± λ/2
    const waves = [{ lam: LIQ_LAMBDA, v: dir * LIQ_SPEED, off: 0, amp: 1, delay: 0 }];
    if (two) waves.push({ lam: 1.05, v: -dir * LIQ_SPEED * .7, off: dir * .12, amp: .5, delay: .4 });   // zweite, kleinere, langsamer, entgegen
    // Tempo schwillt weich an und ab (nie null, G3): Geschwindigkeit 1 + .6 · Glocke, der Weg ist ihr Integral (vorab je 1/60 s)
    const bell = k => smooth7(Math.min(k, 1 - k) / .5), I = new Float32Array(Math.ceil(LIQ_DUR * 60) + 2);
    for (let i = 1; i < I.length; i++) I[i] = I[i - 1] + (1 + .6 * bell((i - .5) / 60 / LIQ_DUR)) / 60;
    const Iat = t => { const x = Math.min(I.length - 2, Math.max(0, t * 60)), i = Math.floor(x); return I[i] + (I[i + 1] - I[i]) * (x - i); };
    const norm = 1 / (1 + (two ? .5 : 0));
    const dsp = new Float32Array(N), dx = L / (N - 1), f2 = q => q.toFixed(2);
    const t0 = performance.now();
    const frame = now => {
      const t = (now - t0) / 1000;
      if (t >= LIQ_DUR) { liqEnd(); return; }                             // Ende nach 4,8 s Bewegung: saubere Linie
      for (let j = 0; j < N; j++) dsp[j] = 0;
      for (const w of waves) {
        const k = (t - w.delay) / (LIQ_DUR - w.delay);
        const env = smooth7(Math.min(k / .38, (1 - k) / .38));            // wächst, schwillt, flacht ab — G3, ohne Überschwingen
        if (env <= 0) continue;
        const c = .5 + w.off + w.v * (Iat(t) - Iat(LIQ_DUR / 2));        // Tempo wechselt weich (G3), nie null
        for (let j = 0; j < N; j++) dsp[j] -= LIQ_AMP * H * norm * w.amp * env * Math.cos(2 * Math.PI * (j / (N - 1) - c) / w.lam);   // < 0: über der Oberkante
      }
      for (let j = 0; j < N; j++) { const x = j / (N - 1); dsp[j] *= smooth7(Math.min(x, 1 - x) / .22); }   // Enden waagerecht, sehr sanft (G3)
      let kmax = 0;                                                       // nie enger gekrümmt als die Pillenenden (Radius r)
      for (let j = 1; j < N - 1; j++) { const d1 = (dsp[j + 1] - dsp[j - 1]) / (2 * dx), d2 = (dsp[j - 1] - 2 * dsp[j] + dsp[j + 1]) / (dx * dx); kmax = Math.max(kmax, Math.abs(d2) / (1 + d1 * d1) ** 1.5); }
      const cl = kmax > 1 / r ? 1 / (r * kmax) : 1;
      const P = i => { const j = Math.max(0, Math.min(N - 1, i)); return [j / (N - 1) * L, base + dsp[j] * cl]; };
      let [x1, y1] = P(0), d = `M${f2(x1)} ${f2(y1)}`;
      for (let i = 0; i < N - 1; i++) {                                  // Catmull-Rom-Spline durch alle Stützstellen: glatt, keine Knicke
        const [xa, ya] = P(i - 1); [x1, y1] = P(i); const [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
        d += `C${f2(x1 + (x2 - xa) / 6)} ${f2(y1 + (y2 - ya) / 6)} ${f2(x2 - (x3 - x1) / 6)} ${f2(y2 - (y3 - y1) / 6)} ${f2(x2)} ${f2(y2)}`;
      }
      d += `A${f2(r)} ${f2(r)} 0 0 1 ${f2(W)} ${f2(base + r)}L${f2(W)} ${f2(base + H - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(L)} ${f2(base + H)}`
         + `L${f2(r)} ${f2(base + H)}A${f2(r)} ${f2(r)} 0 0 1 0 ${f2(base + H - r)}Z`;
      a.style.setProperty('--liq', `path("${d}")`);
      liqRaf = requestAnimationFrame(frame);
    };
    liqRaf = requestAnimationFrame(frame);
  };
  a.addEventListener('pointerenter', e => {
    if (calm.matches || e.pointerType !== 'mouse' || liqRaf) return;      // läuft die Welle schon, fließt sie weiter — kein Neustart
    clearTimeout(liqTimer); liqTimer = setTimeout(liqStart, LIQ_AFTER);
  });
  a.addEventListener('pointerleave', () => clearTimeout(liqTimer));      // vor dem Beginn abbrechen; eine laufende Welle läuft sauber zu Ende (EIN Fluss, kein Abbruch)
  let keyFocus = false;                       // Pille per Tastatur sichtbar?
  a.addEventListener('pointerleave', leave);
  a.addEventListener('focus', () => { keyFocus = a.matches(':focus-visible'); });
  a.addEventListener('blur', () => { if (keyFocus && !a.matches(':hover')) leave(); keyFocus = false; });
});

/* ═══ 7 Füllung als Flüssigkeit — zähflüssig (»Honig«) ═══
   Beim Hover steigt der Pegel; die Oberfläche wölbt sich breit zum Cursor und fließt
   träge zurück. Wenige Stützstellen und starke Kopplung: große, ruhige Wellen,
   kaum kleine Nebenwellen. Ohne reduzierte Bewegung.
   Touch (iPhone/iPad, kein Cursor): die eingerastete Karte füllt sich; die Wölbung
   wandert zu zufälligen Stellen, dazu leichte Stöße — Finger auf der Karte bewegt das Wasser auch. */
if (!calm.matches) {
  const isTouchUI = !matchMedia('(hover:hover) and (pointer:fine)').matches;
  root.classList.add('liquid');
  const N = 44;               // Stützstellen der Oberfläche — viele für eine feine Kurve …
  const TENSION = .0035;      // zieht jede Stelle zurück auf den Pegel (schwach: langsame Wellen)
  const SPREAD = .44;         // … und starke Kopplung: breite Wellen, keine kleinen Nebenwellen
  const DAMP = .988;          // Dämpfung pro Schritt (wenig: Wellen tragen weit)
  // Pegel als kritisch gedämpfte Feder: sanfter Anlauf, weiches Ankommen, Tempo ohne Knick
  // (auch beim Umkehren mitten im Füllen). Maus: voll nach ≈ 1,5 s;
  // Touch: 85 % nach ≈ 0,39 s, passend zur Navigation (NAV_AFTER_FILL).
  const OMEGA = isTouchUI ? 8.4 : 4;   // 25 % langsamer als zuvor (10,5 / 5)
  const PUSH = .0192, PRESS = .0256; // seitliches Schieben / Drücken nahe der Oberfläche (sanft) — +28 %
  const BULGE = .82, REACH = .24;    // Wölbung zum Cursor: Stärke (Höhe der Welle +40 % gegenüber .8 bei Tempo .5), Breite (Anteil der Kartenbreite)
  const LAG = .27;                   // Sekunden: die Wölbung folgt einer geglätteten Cursorposition (+28 % flinker)
  const PACE = .64;                  // Wellen-Tempo (+28 % gegenüber .5)
  const FULL = 1.02;          // Ziel knapp über der Kante: hält oben an, ohne einen Spalt zu lassen
  // Touch: wo der Finger zuletzt war (Bildschirm-x) — die Wölbung entsteht dort (auch beim Tippen auf die Navigation oder beim
  // Wischen zur Karte) und entspannt sich nach ≈ 3 s wieder auf ihre wandernde Bahn
  let touchX = null, touchT = -1e9, touching = false;
  if (isTouchUI) {
    const note = e => { const t = e.touches[0] || e.changedTouches[0]; if (t) { touchX = t.clientX; touchT = performance.now() / 1000; } };
    const opt = { passive:true, capture:true };
    addEventListener('touchstart', e => { touching = true; note(e); }, opt);
    addEventListener('touchmove', note, opt);
    const end = e => { touching = false; note(e); };
    addEventListener('touchend', end, opt); addEventListener('touchcancel', end, opt);
  }
  const live = new Set(); let raf = 0, t0 = 0;
  const fills = new Map();                                   // Touch: Bildschirm → Füllung starten
  fillAhead = el => fills.get(el)?.();                       // 0,33 s vor Ende des Gleitens (4)

  document.querySelectorAll('.card').forEach(card => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'liq'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(svg.namespaceURI, 'path'); svg.append(path);
    card.prepend(svg);        // zuerst = unter Halbton, Nummer und Schrift
    const s = { card, path, dx:[...card.querySelectorAll('.meta .dx')], ta:[...card.querySelectorAll('.title a')], w:1, h:1, level:0, lv:0, target:0, y:new Float32Array(N), v:new Float32Array(N), px:null, py:null, mx:null, ms:null, t:Math.random() * 100, ph:Math.random() * 6.3 };
    const size = () => { s.w = card.clientWidth; s.h = card.clientHeight; svg.setAttribute('viewBox', `0 0 ${s.w} ${s.h}`); draw(s); };
    new ResizeObserver(size).observe(card);
    const wake = () => { live.add(s); if (!raf) { t0 = 0; raf = requestAnimationFrame(loop); } };
    if (isTouchUI) {
      // Touch: Füllung, sobald die Karte fast eingerastet ist (99,4 % im Bild). Beim Verlassen bleibt sie voll;
      // erst ganz außer Sicht wird sie unsichtbar zurückgesetzt, damit sie beim nächsten Mal wieder steigt.
      // Karten höher als der Bildschirm: bezogen auf den Anteil, der überhaupt ins Bild passt.
      const screen = card.closest('.slide, .end');
      const IN = .994 * Math.min(1, innerHeight / screen.offsetHeight);   // Start bei 99,4 % im Bild
      const GONE = .002;                                  // außer Sicht: unter 0,2 % (< 2 px)
      const fill = () => {
        if (s.target === FULL) return;
        s.target = FULL; fillStart = performance.now(); s.mx = s.mx ?? .5; wake();
        const i = slides.indexOf(screen);
        if (i >= 0) setActive(i, true);                    // Navigation startet zugleich mit dem Steigen
      };
      fills.set(screen, fill);
      new IntersectionObserver(([en]) => {
        if (en.intersectionRatio >= IN) fill();          // Rückfall, falls kein Gleiten voranging (z. B. Link)
        else if (en.intersectionRatio < GONE && s.target === FULL) {   // »isIntersecting« bleibt an der Kante wahr
          s.target = 0; s.level = 0; s.lv = 0; s.mx = null; s.y.fill(0); s.v.fill(0); draw(s);   // außer Sicht: leer
        }
      }, { threshold:[GONE, IN] }).observe(screen);
      card.addEventListener('pointermove', e => { if (e.pointerType === 'touch') { stir(s, e); wake(); } });
      card.addEventListener('pointerup', () => { s.px = null; });
      size();
      return;
    }
    card.addEventListener('pointerenter', e => { s.target = FULL; stir(s, e); wake(); });
    card.addEventListener('pointerleave', e => { stir(s, e); s.target = 0; s.px = s.mx = null; wake(); });
    card.addEventListener('pointermove', e => { stir(s, e); wake(); });
    card.addEventListener('focusin', () => { s.target = FULL; wake(); });
    card.addEventListener('focusout', () => setTimeout(() => { if (!card.matches(':hover, :focus-within')) { s.target = 0; wake(); } }));
    size();
  });

  // ganz gefüllt und in Ruhe: keine Wellen, bis sich der Pegel wieder bewegt
  const atRest = s => s.target === FULL && Math.abs(FULL - s.level) < .003 && Math.abs(s.lv) < .01;
  const smooth = k => (k = Math.min(1, Math.max(0, k)), k * k * (3 - 2 * k));
  function stir(s, e){
    const r = s.card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    s.mx = x / s.w;
    if (s.px !== null && !atRest(s)) {
      const dx = x - s.px, dy = y - s.py, i = x / s.w * (N - 1);
      const near = Math.exp(-(((y - (1 - s.level) * s.h) / 160) ** 2));   // nur nahe der Oberfläche
      for (let j = 0; j < N; j++) {
        const d = (j - i) / 8, g = Math.exp(-d * d);   // breit verteilt: keine spitzen Stellen am Cursor
        s.v[j] += (dx * PUSH * d + dy * PRESS * near) * g;
      }
    }
    s.px = x; s.py = y;
  }
  function step(s, dt){
    const { y, v } = s;
    s.lv += (OMEGA * OMEGA * (s.target - s.level) - 2 * OMEGA * s.lv) * dt;   // Feder: Beschleunigung aus Abstand und Tempo
    s.level += s.lv * dt;
    s.t += dt;
    if (isTouchUI && s.mx !== null) {             // kein Cursor: Wölbung gleitet auf überlagerten, langsamen Bahnen …
      const wander = .5 + .3 * Math.sin(s.t * .37 + s.ph) + .12 * Math.sin(s.t * .91 + s.ph * 2.3);
      if (touchX === null) s.mx = wander;
      else {                                      // … und liegt dort, wo der Finger war (klingt nach ≈ 3 s ab)
        const k = Math.exp(-(touching ? 0 : performance.now() / 1000 - touchT) / 3);
        const at = Math.min(1, Math.max(0, (touchX - s.card.getBoundingClientRect().left) / s.w));
        s.mx = wander + (at - wander) * k;
      }
    }
    if (s.mx === null) s.ms = null;           // geglättete Position: die Wölbung folgt träge, ohne Ruck
    else {
      const sway = .045 * Math.sin(s.t * .6 + s.ph);   // auch bei ruhender Maus: sanftes Pendeln
      s.ms = s.ms === null ? s.mx : s.ms + (s.mx + sway - s.ms) * (1 - Math.exp(-dt / LAG));
    }
    const lift = BULGE * (1 + .23 * Math.sin(s.t * .8 + s.ph));   // Höhe schwillt leicht an und ab
    for (let i = 0; i < N; i++) {
      const l = y[i > 0 ? i - 1 : 0], r = y[i < N - 1 ? i + 1 : N - 1];
      let f = -TENSION * y[i] + SPREAD * (l + r - 2 * y[i]);
      if (s.ms !== null) { const d = (i / (N - 1) - s.ms) / REACH; f -= lift * Math.exp(-d * d); }   // breite Wölbung zum (geglätteten) Cursor
      v[i] = (v[i] + f * PACE) * DAMP ** PACE;   // verlangsamte Physik: gleiche Form, halbes Tempo
    }
    let e = Math.abs(s.target - s.level) + Math.abs(s.lv) + (s.mx !== null ? .01 : 0);   // solange der Pegel wandert, lebt die Oberfläche
    for (let i = 0; i < N; i++) { y[i] += v[i] * PACE; e += Math.abs(v[i]) + Math.abs(y[i]) * .01; }
    if (atRest(s)) { y.fill(0); v.fill(0); return false; }   // voll: Wellen aus, Schleife hält an
    return e > .002;
  }
  function draw(s){
    const { w, h, y } = s, base = (1 - s.level) * h;
    const filled = s.level > .97;                // ganz voll: vergrößerte Details schlicht weiß (CSS)
    if (filled !== s.filled) { s.filled = filled; s.card.classList.toggle('filled', filled); }
    if (s.level < .001 && s.target === 0) { s.path.setAttribute('d', ''); return; }
    // unten beginnt die Oberfläche als gerade Linie; die Wellen wachsen auf den ersten 18 % schnell,
    // aber weich herein — und reichen nie unter die Unterkante
    // oben genauso: kurz vor ganz voll laufen die Wellen weich aus
    const env = smooth(s.level / .18) * smooth((FULL - s.level) / .15);
    const X = i => i / (N - 1) * w, Y = i => Math.min(h, base + y[i] * env);
    // Catmull-Rom-Spline durch alle Stützstellen: durchgehend glatt, keine Knicke
    const P = i => [X(Math.max(0, Math.min(N - 1, i))), Y(Math.max(0, Math.min(N - 1, i)))];
    let d = `M0 ${h}L0 ${Y(0).toFixed(1)}`;
    for (let i = 0; i < N - 1; i++) {
      const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
      d += `C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    s.path.setAttribute('d', d + `L${w} ${h}Z`);
    // vergrößertes Detail: Schriftfarbe wechselt genau an der Oberfläche — darunter weiß, darüber Projektfarbe
    const open = [...s.dx.filter(x => x.parentNode.matches('.on, :hover')), ...s.ta.filter(a => a.matches(':hover, :focus-visible'))];   // + Titel-Pille
    if (!open.length) return;
    const c = s.card.getBoundingClientRect();
    open.forEach(x => {
      const r = x.getBoundingClientRect(), i = Math.round((r.left + r.width / 2 - c.left) / w * (N - 1));
      const cut = (c.top + Y(Math.max(0, Math.min(N - 1, i))) - r.top) / r.height * 100;
      x.style.setProperty('--cut', Math.max(0, Math.min(100, cut)).toFixed(1) + '%');
    });
  }
  function loop(now){
    const dt = Math.min(.05, t0 ? (now - t0) / 1000 : 1 / 60); t0 = now;
    const n = Math.max(1, Math.round(dt * 60));   // Physik in festen 60-Hz-Schritten
    for (const s of live) { let busy = false; for (let k = 0; k < n; k++) busy = step(s, dt / n) || busy; draw(s); if (!busy) live.delete(s); }
    raf = live.size ? requestAnimationFrame(loop) : 0;
  }
}

/* ═══ 8 Cursor mit Spur aus 9 Kreisen — nur mit Maus ═══ */
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const N = 9, R = 11;                       // R = halbe Cursorgröße: Spur hängt an der Mitte
  const fx = document.createElement('div');
  fx.className = 'fx';
  fx.setAttribute('aria-hidden', 'true');
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.innerHTML = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M0 0H11A11 11 0 1 1 0 11Z"/></svg>';
  const dots = !calm.matches ? Array.from({ length:N }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'trail';
    d.style.setProperty('--sz', (16.2 * .77 ** i).toFixed(1) + 'px');   // Durchmesser wie die Deckkraft: 16,2 px (18 × 0,9), jeder weitere × 0,77
    d.style.opacity = (.9 * .77 ** i).toFixed(3);   // erster Kreis 90 %, jeder weitere × 0,77
    fx.append(d);
    return { el:d, x:-99, y:-99 };
  }) : [];
  fx.append(cur);                             // zuletzt = oben
  const inv = document.createElement('div');  // Kopie in umgekehrten Farben, nur über der Navigation sichtbar
  inv.className = 'fx-inv';
  const cur2 = cur.cloneNode(true);
  inv.append(cur2);
  fx.append(inv);
  const clipNav = () => {                     // Ausschnitt = Fläche der Navigation, sobald sie sichtbar ist
    if (lastP < .6) { inv.style.clipPath = 'inset(100%)'; return; }
    const r = nav.getBoundingClientRect();
    const b = r.bottom + (fullNav.matches ? parseFloat(getComputedStyle(root).getPropertyValue('--nav-line')) : 0);   // bis genau an die Oberkante der Karte
    inv.style.clipPath = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - b}px ${r.left}px)`;
  };
  onHeader.push(clipNav);                   // die Leiste bewegt sich nur mit dem Kopf
  clipNav();                                // Anfangszustand (Seite kann mitten im Scrollen geladen werden)
  addEventListener('resize', clipNav);
  document.body.append(fx);
  root.classList.add('has-cursor', 'is-away');

  let mx = -99, my = -99, running = false, last = 0;
  const c = { x:-99, y:-99 };                 // Cursorposition (= Maus)
  const FOLLOW = .03, SLOWER = .9;            // Spur: erster Kreis folgt mit 3 % pro Frame, jeder weitere 10 % träger
  const step = () => {                        // ein Schritt à 16,7 ms (60 fps)
    c.x = mx; c.y = my;                       // Cursor sitzt direkt auf der Maus — kein Nachfedern
    let px = c.x + R, py = c.y + R;           // jeder Kreis folgt seinem Vorgänger
    dots.forEach((d, i) => {
      const f = FOLLOW * SLOWER ** i;
      d.x += (px - d.x) * f; d.y += (py - d.y) * f;
      px = d.x; py = d.y;
    });
  };
  const loop = now => {
    const steps = Math.min(4, Math.max(1, Math.round((now - (last || now - 16.7)) / 16.7)));
    last = now;
    for (let i = 0; i < steps; i++) step();   // bildratenunabhängig
    const dpr = devicePixelRatio || 1, snap = v => Math.round(v * dpr) / dpr;   // auf Gerätepixel: bleibt scharf
    cur.style.transform = cur2.style.transform = `translate3d(${snap(c.x)}px,${snap(c.y)}px,0)`;
    let still = true;
    for (const d of dots) {
      const dist = Math.hypot(c.x + R - d.x, c.y + R - d.y);
      if (dist > .2) still = false;
      d.el.style.transform = `translate3d(${d.x}px,${d.y}px,0)`;   // in Ruhe verdeckt der Cursor die Spur
    }
    running = !still;
    if (running) requestAnimationFrame(loop); else last = 0;
  };
  addEventListener('pointermove', ev => {
    if (c.x === -99) { c.x = ev.clientX; c.y = ev.clientY; dots.forEach(d => { d.x = c.x + R; d.y = c.y + R; }); }
    mx = ev.clientX; my = ev.clientY;
    cur.style.transform = cur2.style.transform = `translate3d(${mx}px,${my}px,0)`;   // sofort, ohne auf den nächsten Frame zu warten
    const link = !!ev.target.closest('a');
    cur.classList.toggle('is-link', link); cur2.classList.toggle('is-link', link);
    root.classList.remove('is-away');
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive:true });
  document.addEventListener('pointerleave', () => root.classList.add('is-away'));
  addEventListener('blur', () => root.classList.add('is-away'));
}
