#!/usr/bin/env bash
# Prüfung vor der Veröffentlichung: lokal (bash tools/check.sh) und bei jedem Push (.github/workflows/validate.yml).
# Bricht beim ersten Fehler mit Rückgabewert ≠ 0 ab.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "· PHP-Syntax";            php -l index.php; php -l site.webmanifest.php
echo "· JavaScript-Syntax";     node --check main.js
echo "· projects.json gültig";  python3 -c "import json; json.load(open('projects.json'))"

n=$(python3 -c "import json; print(len(json.load(open('projects.json'))))")
echo "· Icons für alle $n Projekte"
for ((i = 0; i < n; i++)); do
  for f in "fav-$i.svg" "fav-$i-32.png" "touch-$i.png" "icon-192-$i.png" "icon-512-$i.png" "maskable-192-$i.png" "maskable-512-$i.png"; do
    test -f "app-icons/$f" || { echo "FEHLT: app-icons/$f (python3 tools/icons.py)"; exit 1; }
  done
done

test -f img/og.png || { echo "FEHLT: img/og.png"; exit 1; }
echo "· Projektfarben";         python3 tools/colors.py
echo "alles in Ordnung"
