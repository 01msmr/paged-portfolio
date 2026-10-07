<?php
/* msmr.dev — die Seite wird aus projects.json gebaut (eine Quelle für Karten, Navigation,
   Linkseite, Zähler und Icons). Kein Build-Schritt: der Server rendert bei jedem Aufruf. */

// Sicherheits-Kopfzeilen (vor jeder Ausgabe). Bewusst ohne Content-Security-Policy.
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$projects = json_decode(file_get_contents(__DIR__ . '/projects.json'), true);
if (!is_array($projects) || !$projects) throw new RuntimeException('projects.json ist kaputt: ' . json_last_error_msg());   // lauter Fehler statt count(null); läuft auf jeder PHP-Version
$n = count($projects);

function e($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function color($p) { return 'oklch(' . (($p['hue'][2] ?? .7) * 100) . '% ' . $p['hue'][0] . ' ' . $p['hue'][1] . ')'; }   // hue: [Chroma, Farbton, Helligkeit (optional, sonst 70 %)]
function two($i) { return str_pad((string)$i, 2, '0', STR_PAD_LEFT); }
// Links auf andere Seiten öffnen in einem neuen Tab, msmr.dev selbst nicht
function target($url) {
  return parse_url($url, PHP_URL_HOST) === 'msmr.dev' ? '' : ' target="_blank" rel="noopener"';
}
// Dateien mit Änderungszeit als Version: lange gecacht, bei Änderung sofort neu
function asset($file) { return $file . '?v=' . filemtime(__DIR__ . '/' . $file); }

$words = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve'];
$count = $words[$n] ?? (string)$n;
$icon = random_int(0, $n - 1);               // Icon in einer der Projektfarben — bei jedem Laden eine andere
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>msmr.dev — Projects</title>
<meta name="description" content="web &amp; more. One screen per project.">
<meta property="og:title" content="msmr.dev — Projects">
<meta property="og:description" content="web &amp; more. <?= $count ?> projects, one screen each.">
<meta property="og:url" content="https://msmr.dev/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="msmr.dev">
<meta property="og:image" content="<?= e('https://msmr.dev/' . asset('img/og.png')) ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="msmr.dev: the a.msmr project card, filling with yellow like a liquid">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://msmr.dev/">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e0f10" media="(prefers-color-scheme: dark)">

<link rel="preload" href="fonts/hanken-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="<?= asset("app-icons/fav-$icon.svg") ?>" type="image/svg+xml">
<link rel="icon" href="<?= asset("app-icons/fav-$icon-32.png") ?>" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="<?= asset("app-icons/touch-$icon.png") ?>">
<link rel="manifest" href="site.webmanifest.php">
<link rel="stylesheet" href="<?= asset('style.css') ?>">
</head>
<body>

<header class="bar">
  <button class="fs" type="button" aria-label="Fullscreen" hidden><span>F</span></button>   <!-- Rechner: Vollbild, im Eckquadrat links oben (main.js 4) -->
  <a class="mark" href="#top" aria-label="msmr.dev, back to top">msmr<i>.dev</i></a>
  <nav class="nav" aria-label="Projects">
    <i class="nav__hl" aria-hidden="true"></i><i class="nav__under" aria-hidden="true"></i>   <!-- Fenster (folgt der Maus) · Linie unter dem aktiven Eintrag (bleibt) — beide Ausschnitte desselben Farbbands -->
    <span class="nav-pad" aria-hidden="true">00</span>   <!-- unsichtbarer Platzhalter (Telefon): links vom ersten Eintrag steht immer ein Nachbar -->
<a href="#top" class="nav-start" aria-label="start" style="--hl:var(--end-fill)"><b>↑</b><span>start</span></a>   <!-- nur Ziel (Zielen, Tippen): der Startbildschirm; dort bleibt 01 aktiv -->
<?php foreach ($projects as $i => $p): ?>
    <a href="#<?= e($p['id']) ?>" style="--hl:<?= color($p) ?>"><b><?= two($n - $i) ?></b><span><?= e($p['name']) ?></span></a>
<?php endforeach; ?>
    <a href="#links" class="nav-end" style="--hl:var(--end-fill)"><b>↗</b><span>urls</span></a>
    <span class="nav-pad" aria-hidden="true">00</span>   <!-- … und rechts vom letzten -->
  </nav>
</header>

<div class="pager">   <!-- Touch: eigener Scrollbereich — iOS rastet dort sauber ein (auf der ganzen Seite erst nachträglich) -->
<main>

  <section class="hero" id="top">
    <h1 class="mark-slot"><span class="sr">msmr.dev</span></h1>
    <p class="lede">web &amp; more.</p>
    <div class="cue"><a href="#<?= e($projects[0]['id']) ?>">↓ <?= $count ?> projects</a><span>Lake Constance</span></div>
  </section>

<?php foreach ($projects as $i => $p): ?>
  <section class="slide" id="<?= e($p['id']) ?>" style="--hl:<?= color($p) ?>">
    <article class="card"<?= isset($p['shot']) ? ' data-shot="' . e($p['shot']) . '"' : '' ?>>
<?php if (isset($p['shot'])): ?>
      <canvas class="shot" aria-hidden="true"></canvas><span class="shot full" aria-hidden="true"></span><span class="rest-img" aria-hidden="true"></span>
<?php endif; ?>
      <i class="edge" aria-hidden="true"></i>   <!-- Kontur: über Flüssigkeit, Raster und Bild, unter Zahl und Schrift -->
      <div class="meta"><?php foreach ($p['tech'] as $t): ?><span class="d"><span class="dx"><?= e($t) ?></span></span><?php endforeach; ?></div>
      <span class="num" aria-hidden="true"><?= two($n - $i) ?></span>
      <div class="main">
        <h2 class="title"><?php
          $parts = [];
          foreach ($p['title'] as $t)
            $parts[] = isset($t['url']) ? '<a href="' . e($t['url']) . '"' . target($t['url']) . '>' . e($t['label']) . '</a>' : e($t['label']);
          echo implode(' ', $parts);
        ?></h2>
        <p class="tagline<?= strpos($p['text'], "\n") !== false ? ' tagline--lines' : '' ?>"><?= nl2br(e($p['text']), false) ?></p>   <!-- \n in projects.json: Zeilenumbruch — dann bestimmen die Umbrüche die Zeilen -->
      </div>
    </article>
  </section>

<?php endforeach; ?>
</main>

<footer class="end" id="links">
  <div class="card card--end inv">
    <h2 class="end__head"><span>all projects</span></h2>
    <nav class="links" aria-label="All projects">
<?php foreach ($projects as $p): ?>
      <a href="<?= e($p['url']) ?>" style="--hl:<?= color($p) ?>"<?= target($p['url']) ?>><?= e($p['name']) ?></a>
<?php endforeach; ?>
    </nav>
    <p class="end__note">made at Lake Constance.</p>
  </div>
</footer>
</div>

<script src="<?= asset('main.js') ?>"></script>
</body>
</html>
