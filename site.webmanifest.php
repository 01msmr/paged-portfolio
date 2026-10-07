<?php
// Web-App-Manifest mit Icon in einer zufälligen Projektfarbe (wie Favicon und iOS-Icon)
header('Content-Type: application/manifest+json');
header('Cache-Control: no-store');
// Dateien mit Änderungszeit als Version (wie asset() in index.php): die Icons sind ein Jahr gültig, nach tools/icons.py kommen die neuen sofort
function asset($file) { return $file . '?v=' . filemtime(__DIR__ . '/' . $file); }
$n = random_int(0, count(json_decode(file_get_contents(__DIR__ . '/projects.json'), true)) - 1);
echo json_encode([
  'name'             => 'msmr.dev',
  'short_name'       => 'msmr',
  'start_url'        => '/',
  'display'          => 'standalone',
  'background_color' => '#ffffff',
  'theme_color'      => '#ffffff',
  'icons'            => [
    ['src' => asset("app-icons/icon-192-$n.png"), 'sizes' => '192x192', 'type' => 'image/png'],
    ['src' => asset("app-icons/icon-512-$n.png"), 'sizes' => '512x512', 'type' => 'image/png'],
    ['src' => asset("app-icons/maskable-192-$n.png"), 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'maskable'],
    ['src' => asset("app-icons/maskable-512-$n.png"), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
  ],
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
