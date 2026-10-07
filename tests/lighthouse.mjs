// Lighthouse-Messung für msmr.dev — nur Entwicklung, die Seite lädt davon nichts.
//   node lighthouse.mjs [--url <Adresse>] [--runs 3] [--check] [--write-budget]
// Gemessen wird in zwei Profilen (Handy, Desktop); je Wert zählt der Median der Läufe.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '.lighthouse');
const BUDGET = path.join(here, 'lighthouse-budget.json');
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const PROFILES = { mobile: undefined, desktop: desktopConfig };   // Standard von Lighthouse = Handy mit gedrosselter Verbindung

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const RUNS = Math.max(1, parseInt(opt('--runs', '3'), 10));
let url = opt('--url');

const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Kein --url: lokalen PHP-Server auf 8765 nutzen oder selbst starten (und am Ende beenden). */
async function ensureServer() {
  if (url) return () => {};
  url = 'http://127.0.0.1:8765/';
  const up = async () => { try { return (await fetch(url)).ok; } catch { return false; } };
  if (await up()) return () => {};
  const php = spawn('php', ['-S', '127.0.0.1:8765', '-t', '..'], { cwd: here, stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise(r => setTimeout(r, 100));
  if (!(await up())) { php.kill(); throw new Error('PHP-Server startet nicht'); }
  return () => php.kill();
}

async function measure(chrome, profile) {
  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    const { lhr } = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATEGORIES }, PROFILES[profile]);
    fs.writeFileSync(path.join(OUT, `${profile}-${i}.json`), JSON.stringify(lhr, null, 1));
    const a = lhr.audits;
    runs.push({
      lhr,
      scores: Object.fromEntries(CATEGORIES.map(c => [c, Math.round(lhr.categories[c].score * 100)])),
      lcp: a['largest-contentful-paint'].numericValue,
      tbt: a['total-blocking-time'].numericValue,
      cls: a['cumulative-layout-shift'].numericValue,
      kb: a['total-byte-weight'].numericValue / 1024,
    });
  }
  const med = f => median(runs.map(f));
  const result = {
    scores: Object.fromEntries(CATEGORIES.map(c => [c, Math.round(med(r => r.scores[c]))])),
    lcp: Math.round(med(r => r.lcp)), tbt: Math.round(med(r => r.tbt)),
    cls: +med(r => r.cls).toFixed(3), kb: Math.round(med(r => r.kb)),
    all: Object.fromEntries(CATEGORIES.map(c => [c, runs.map(r => r.scores[c])])),
  };
  // Prüfpunkte aus dem Lauf, dessen Leistungswert der Median ist (stellvertretend)
  const rep = [...runs].sort((x, y) => x.scores.performance - y.scores.performance)[runs.length >> 1];
  result.issues = Object.values(rep.lhr.audits)
    .filter(x => x.score !== null && x.score < 1 && !['informative', 'manual', 'notApplicable', 'error'].includes(x.scoreDisplayMode))
    .map(x => ({ id: x.id, title: x.title, score: x.score, level: x.score < .5 ? 'nicht bestanden' : 'Warnung',
      elements: (Array.isArray(x.details?.items) ? x.details.items : []).map(i => i?.node?.snippet ?? i?.node?.selector ?? i?.url ?? '').filter(Boolean).slice(0, 5) }));
  return result;
}

const pad = (s, n) => String(s).padEnd(n);
function table(res) {
  const rows = [['', 'Leistung', 'Barrierefreiheit', 'Best Practices', 'Auffindbarkeit', 'LCP ms', 'TBT ms', 'CLS', 'Daten KB']];
  for (const [p, r] of Object.entries(res))
    rows.push([p, ...CATEGORIES.map(c => r.scores[c]), r.lcp, r.tbt, r.cls, r.kb]);
  const w = rows[0].map((_, i) => Math.max(...rows.map(r => String(r[i]).length)));
  return rows.map(r => r.map((c, i) => pad(c, w[i])).join('  ')).join('\n');
}

function summary(res) {
  let md = `# Lighthouse — ${url} (Median aus ${RUNS} Läufen)\n\n`;
  md += '| Profil | Leistung | Barrierefreiheit | Best Practices | Auffindbarkeit | LCP ms | TBT ms | CLS | Daten KB |\n|---|---|---|---|---|---|---|---|---|\n';
  for (const [p, r] of Object.entries(res)) md += `| ${p} | ${CATEGORIES.map(c => r.scores[c]).join(' | ')} | ${r.lcp} | ${r.tbt} | ${r.cls} | ${r.kb} |\n`;
  md += '\nEinzelwerte je Lauf: ' + Object.entries(res).map(([p, r]) => `${p} ` + CATEGORIES.map(c => `${c} ${r.all[c].join('/')}`).join(', ')).join(' · ') + '\n';
  for (const [p, r] of Object.entries(res)) {
    md += `\n## Nicht bestandene und Warn-Prüfpunkte — ${p}\n\n`;
    if (!r.issues.length) md += '(keine)\n';
    for (const i of r.issues) md += `- **${i.title}** (\`${i.id}\`, ${i.level}, ${i.score})${i.elements.length ? ' — ' + i.elements.map(e => '`' + e.replace(/\s+/g, ' ').slice(0, 120) + '`').join(', ') : ''}\n`;
  }
  return md;
}

const budgetFrom = res => Object.fromEntries(Object.entries(res).map(([p, r]) => [p, {
  ...Object.fromEntries(CATEGORIES.map(c => [c, r.scores[c] - 3])),   // Untergrenze: Median − 3 Punkte
  cls: +(r.cls + .02).toFixed(3),                                       // Obergrenze: Median + 0,02
  kb: Math.ceil(r.kb * 1.2),                                            // Obergrenze: Median + 20 %
}]));

function check(res) {
  const b = JSON.parse(fs.readFileSync(BUDGET, 'utf8')), bad = [];
  for (const [p, r] of Object.entries(res)) {
    for (const c of CATEGORIES) if (r.scores[c] < b[p][c]) bad.push(`${p} ${c}: ${r.scores[c]} < Untergrenze ${b[p][c]}`);
    if (r.cls > b[p].cls) bad.push(`${p} CLS: ${r.cls} > Obergrenze ${b[p].cls}`);
    if (r.kb > b[p].kb) bad.push(`${p} Daten: ${r.kb} KB > Obergrenze ${b[p].kb} KB`);
  }
  return bad;
}

fs.mkdirSync(OUT, { recursive: true });
const stop = await ensureServer();
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
let code = 0;
try {
  const res = {};
  for (const p of Object.keys(PROFILES)) res[p] = await measure(chrome, p);
  console.log(`\nLighthouse — ${url} — Median aus ${RUNS} Läufen\n\n${table(res)}\n`);
  fs.writeFileSync(path.join(OUT, 'summary.md'), summary(res));
  if (flag('--write-budget')) { fs.writeFileSync(BUDGET, JSON.stringify(budgetFrom(res), null, 2) + '\n'); console.log(`Untergrenzen geschrieben: ${path.relative(process.cwd(), BUDGET)}`); }
  if (flag('--check')) {
    const bad = check(res);
    if (bad.length) { console.error('Unter den Untergrenzen:\n  ' + bad.join('\n  ')); code = 1; } else console.log('Alle Untergrenzen eingehalten.');
  }
} finally { await chrome.kill(); stop(); }
process.exit(code);
