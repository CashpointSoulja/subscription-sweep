// Draws the four go-to-market charts as PNGs (2x) in the product's own fonts and colours.
// Numbers come from docs/evidence/11-go-to-market-data.md (voc gtm teardown + DataForSEO, 5 Nov 2026).
// Usage: node scripts/gtm-charts.mjs   -> public/shots/gtm-chart-*.png
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FONTS = `${ROOT}/node_modules/@fontsource`;
// Palette validated with the dataviz validator on the paper surface: green = the data that matters,
// warm grey = context/comparison (neutral by design). Text stays in ink tokens, never the bar colour.
const C = { bg: '#f7f4ee', ink: '#1f1b16', ink2: '#5e554a', muted: '#6e655a', grid: 'rgba(31,27,22,.10)', green: '#1b7a48', grey: '#8f8574' };
const W = 1200;
const fmt = n => n.toLocaleString('en-GB');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// bars with a 4px rounded end away from the baseline
const hbar = (x, y, w, h, fill) => w <= 0 ? '' : `<path d="M${x},${y}h${Math.max(0, w - 4)}a4,4 0 0 1 4,4v${h - 8}a4,4 0 0 1 -4,4h${-Math.max(0, w - 4)}z" fill="${fill}"/>`;
const vbar = (x, y, w, h, fill) => h <= 0 ? '' : `<path d="M${x},${y + h}v${-(h - 4)}a4,4 0 0 1 4,-4h${w - 8}a4,4 0 0 1 4,4v${h - 4}z" fill="${fill}"/>`;
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 16}" fill="${o.fill || C.ink}" font-family="${o.mono ? 'Plex Mono' : 'Instrument Sans'}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || 'start'}">${esc(s)}</text>`;
const head = (title, sub) => text(48, 62, title, { size: 30, weight: 600 }) + text(48, 94, sub, { size: 18, fill: C.ink2 });
const source = (y, s) => text(48, y, s, { size: 14, fill: C.muted });

function chartAds() {
  const rows = [['Energy', 479, '479 ads (44%)'], ['Subscriptions', 0, '0'], ['Netflix, Spotify, Disney+, streaming or gyms', 0, '0']];
  const x0 = 48, labelW = 0, top = 140, bw = W - 96 - 170, total = 1077, H = 470;
  let s = head('What Nous’s ads talk about', 'Words in the text of all 1,077 Nous ads in the Meta, Google and TikTok ad libraries');
  [0, 250, 500, 750, 1000].forEach(t => { const gx = x0 + labelW + bw * t / total; s += `<line x1="${gx}" x2="${gx}" y1="${top}" y2="${top + 3 * 86 - 10}" stroke="${C.grid}"/>` + text(gx, top + 3 * 86 + 14, fmt(t), { size: 14, fill: C.muted, anchor: 'middle', mono: true }); });
  rows.forEach(([label, v, vl], i) => {
    const y = top + i * 86;
    s += text(x0, y + 22, label, { size: 19, weight: 500 });
    const w = bw * v / total;
    s += v > 0 ? hbar(x0, y + 34, w, 26, C.green) : `<rect x="${x0}" y="${y + 34}" width="3" height="26" rx="1.5" fill="${C.green}"/>`;
    s += text(x0 + Math.max(w, 3) + 12, y + 54, vl, { size: 18, weight: 500, mono: true });
  });
  s += source(H - 22, 'Source: Nous go-to-market teardown, 5 Nov 2026 (ads from Oct 2025 to Nov 2026). Counts in docs/evidence/11-go-to-market-data.md');
  return { s, H };
}

function chartRuns() {
  const b = [['0–7 days', 422], ['8–14', 169], ['15–30', 176], ['31–60', 53], ['61+', 19]];
  const H = 560, top = 150, ph = 290, x0 = 110, pw = W - x0 - 60, max = 450, bwid = 120;
  let s = head('How long Nous runs an ad before stopping it', '839 stopped Meta ads, by how many days they ran');
  [0, 100, 200, 300, 400].forEach(t => { const gy = top + ph - ph * t / max; s += `<line x1="${x0}" x2="${x0 + pw}" y1="${gy}" y2="${gy}" stroke="${C.grid}"/>` + text(x0 - 14, gy + 5, fmt(t), { size: 14, fill: C.muted, anchor: 'end', mono: true }); });
  const step = pw / b.length;
  b.forEach(([l, v], i) => {
    const h = ph * v / max, x = x0 + i * step + (step - bwid) / 2;
    s += vbar(x, top + ph - h, bwid, h, i === 0 ? C.green : C.grey);
    s += text(x + bwid / 2, top + ph - h - 12, i === 0 ? `${v} (50%)` : fmt(v), { size: 18, weight: 500, anchor: 'middle', mono: true });
    s += text(x + bwid / 2, top + ph + 30, l, { size: 16, fill: C.ink2, anchor: 'middle' });
  });
  s += text(x0 + step + 20, top + 40, 'Half are stopped within a week.', { size: 19, weight: 500 }) + text(x0 + step + 20, top + 66, 'The few that work run for months and get copied (up to 27 versions).', { size: 17, fill: C.ink2 });
  s += source(H - 22, 'Source: Meta Ad Library via the Nous go-to-market teardown, 5 Nov 2026. Median run of a stopped ad: 7 days.');
  return { s, H };
}

function chartSearch() {
  const m = [['2024-11', 1632], ['2024-12', 1867], ['2025-01', 1652], ['2025-02', 1564], ['2025-03', 1559], ['2025-04', 1612], ['2025-05', 1619], ['2025-06', 1824], ['2025-07', 1715], ['2025-08', 1805], ['2025-09', 1853], ['2025-10', 2048], ['2025-11', 1719], ['2025-12', 1717], ['2026-01', 1763], ['2026-02', 1910], ['2026-03', 2506], ['2026-04', 2657], ['2026-05', 2421], ['2026-06', 2450], ['2026-07', 2972], ['2026-08', 3161], ['2026-09', 1406], ['2026-10', 1562]];
  const H = 560, top = 150, ph = 300, x0 = 100, pw = W - x0 - 60, max = 3500;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let s = head('Visits to nous.co from Google, by month', 'Estimated. 91% of them are people searching for “Nous” by name');
  [0, 1000, 2000, 3000].forEach(t => { const gy = top + ph - ph * t / max; s += `<line x1="${x0}" x2="${x0 + pw}" y1="${gy}" y2="${gy}" stroke="${C.grid}"/>` + text(x0 - 14, gy + 5, fmt(t), { size: 14, fill: C.muted, anchor: 'end', mono: true }); });
  const step = pw / m.length, bwid = step - 2;   // 2px surface gap between bars
  m.forEach(([ym, v], i) => {
    const h = ph * v / max, x = x0 + i * step + 1, hot = ym === '2026-08' || ym === '2026-09';
    s += vbar(x, top + ph - h, bwid, h, hot ? C.green : C.grey);
    const [y, mo] = ym.split('-').map(Number);
    if (mo % 3 === 2 || i === m.length - 1) s += text(x + bwid / 2, top + ph + 26, `${MON[mo - 1]} ${String(y).slice(2)}`, { size: 14, fill: C.ink2, anchor: 'middle' });
    if (ym === '2026-08') s += text(x + bwid / 2, top + ph - h - 12, '3,161', { size: 17, weight: 500, anchor: 'middle', mono: true });
    if (ym === '2026-09') s += text(x + bwid / 2, top + ph - ph * 1562 / max - 12, '1,406', { size: 17, weight: 500, anchor: 'middle', mono: true });   // above the taller Oct bar next to it
  });
  s += text(x0 + 20, top + 30, 'Peaked at about 3,200 a month in August 2026, then halved.', { size: 19, weight: 500 });
  s += source(H - 22, 'Source: DataForSEO estimates (organic visits, not Nous’s own analytics), via the Nous go-to-market teardown, 5 Nov 2026.');
  return { s, H };
}

function chartCancel() {
  const rows = [['cancel spotify premium', 18100, 1.36], ['cancel amazon prime', 9900, 0.87], ['cancel disney plus', 9900, 1.01], ['how to cancel netflix', 5400, 1.68], ['cancel now tv', 5400, 2.28], ['how to cancel subscriptions', 4400, 1.84], ['cancel subscriptions', 3600, 2.27], ['cancel apple subscription', 2900, 1.5], ['cancel gym membership', 720, 2.22], null, ['subscription tracker', 170, 5.25, 'cmp'], ['switch energy supplier', 9900, 14.85, 'cmp']];
  const top = 170, rh = 40, labelW = 300, x0 = 48, aX = x0 + labelW, aW = 430, bX = aX + aW + 70, bW = W - bX - 110;
  const H = top + rows.length * rh + 80, maxA = 20000, maxB = 16;
  let s = head('People search to cancel one thing, and those clicks are cheap', 'UK Google searches a month, and what one click costs to buy');
  s += text(aX, top - 20, 'Searches a month', { size: 15, weight: 600, fill: C.ink2 }) + text(bX, top - 20, 'Cost per click', { size: 15, weight: 600, fill: C.ink2 });
  rows.forEach((r, i) => {
    const y = top + i * rh;
    if (!r) { s += `<line x1="${x0}" x2="${W - 48}" y1="${y + rh / 2}" y2="${y + rh / 2}" stroke="${C.grid}"/>` + text(x0, y + rh / 2 + 22, 'for comparison', { size: 14, fill: C.muted }); return; }
    const [l, v, cpc, cmp] = r, col = cmp ? C.grey : C.green;
    s += text(x0, y + 25, l, { size: 17, weight: cmp ? 400 : 500, fill: cmp ? C.ink2 : C.ink });
    const wa = aW * v / maxA, wb = bW * cpc / maxB;
    s += hbar(aX, y + 10, wa, 20, col) + text(aX + wa + 10, y + 26, fmt(v), { size: 15, mono: true });
    s += hbar(bX, y + 10, wb, 20, col) + text(bX + wb + 10, y + 26, `£${cpc.toFixed(2)}`, { size: 15, mono: true });
  });
  s += source(H - 22, 'Source: DataForSEO via treg, 5 Nov 2026, location UK. The nine “cancel” searches add up to about 60,300 a month.');
  return { s, H };
}


function chartPath() {
  // How a member gets from a hook to a yes: four columns, arrows between, and what to measure under each arrow.
  const H = 540, top = 150, colW = 240, gap = (W - 96 - 4 * colW) / 3, xs = [0, 1, 2, 3].map(i => 48 + i * (colW + gap));
  const box = (x, y, w, h, hi) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${hi ? 'rgba(27,122,72,.10)' : '#fffefa'}" stroke="${hi ? C.green : 'rgba(31,27,22,.16)'}" stroke-width="${hi ? 1.5 : 1}"/>`;
  const lines = (x, y, arr, o = {}) => arr.map((t, i) => text(x, y + i * (o.lh || 24), t, o)).join('');
  let s = head('The path a member takes', 'Every way in ends in the same place: one WhatsApp message, and a yes per item');
  ['How they arrive', 'First screen', 'The product', 'The result'].forEach((t, i) => { s += text(xs[i], top, t, { size: 15, weight: 600, fill: C.ink2 }); });
  const y0 = top + 18;
  // column 1: three ways in
  [['Nora message', '(members already in)'], ['Creator ad'], ['“How to cancel X” page']].forEach((l, i) => {
    const y = y0 + i * 78; s += box(xs[0], y, colW, 64) + lines(xs[0] + 18, y + (l.length > 1 ? 27 : 38), l, { size: 17, weight: 500, lh: 22 });
  });
  // column 2: the estimate, with the new line
  s += box(xs[1], y0, colW, 220) + text(xs[1] + 18, y0 + 34, 'Savings estimate', { size: 18, weight: 600 });
  s += lines(xs[1] + 18, y0 + 68, ['energy', 'broadband', 'mobile', 'car insurance'], { size: 16, fill: C.ink2, lh: 26 });
  s += box(xs[1] + 12, y0 + 168, colW - 24, 38, true) + text(xs[1] + 26, y0 + 193, '+ subscriptions', { size: 17, weight: 600 });
  // column 3 and 4: steps
  const steps = (x, arr) => arr.map((t, i) => { const y = y0 + i * 78; return box(x, y, colW, 64, i === arr.length - 1 && x === xs[3]) + lines(x + 18, y + (t.length > 1 ? 27 : 38), t, { size: 17, weight: 500, lh: 22 }); }).join('');
  s += steps(xs[2], [['Bank connected'], ['The sweep runs'], ['One Nora message', 'in WhatsApp']]);
  s += steps(xs[3], [['A yes per item'], ['Nous cancels it'], ['Premium offered', 'after, never before']]);
  // arrows + what to measure under each
  const meas = [['click →', 'sign-up started'], ['estimate →', 'sign-up finished'], ['reply rate', 'yes rate per flag']];
  [0, 1, 2].forEach(i => {
    const ax = xs[i] + colW + 8, bx = xs[i + 1] - 10, ay = y0 + 110;
    s += `<line x1="${ax}" y1="${ay}" x2="${bx - 8}" y2="${ay}" stroke="${C.green}" stroke-width="2.5"/><path d="M${bx - 10},${ay - 7} L${bx},${ay} L${bx - 10},${ay + 7}" fill="none" stroke="${C.green}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += lines((ax + bx) / 2, y0 + 262, meas[i], { size: 14, fill: C.ink2, anchor: 'middle', lh: 19 });   // own row under the boxes, centred on the arrow
    s += `<line x1="${(ax + bx) / 2}" y1="${y0 + 230}" x2="${(ax + bx) / 2}" y2="${y0 + 244}" stroke="${C.grid}" stroke-width="2"/>`;
  });
  s += text(48, y0 + 262, 'Measure', { size: 14, weight: 600, fill: C.muted }) + source(H - 22, 'Premium conversion is measured against a holdout group that doesn’t get the sweep.');
  return { s, H };
}

mkdirSync(`${ROOT}/public/shots`, { recursive: true });
const tmp = `${ROOT}/node_modules/.cache/gtm-charts`;
mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [name, fn] of [['ads', chartAds], ['runs', chartRuns], ['search', chartSearch], ['cancel', chartCancel], ['path', chartPath]]) {
  const { s, H } = fn();
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Instrument Sans';src:url('file://${FONTS}/instrument-sans/files/instrument-sans-latin-400-normal.woff2');font-weight:400}
@font-face{font-family:'Instrument Sans';src:url('file://${FONTS}/instrument-sans/files/instrument-sans-latin-500-normal.woff2');font-weight:500}
@font-face{font-family:'Instrument Sans';src:url('file://${FONTS}/instrument-sans/files/instrument-sans-latin-600-normal.woff2');font-weight:600}
@font-face{font-family:'Plex Mono';src:url('file://${FONTS}/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2');font-weight:400}
@font-face{font-family:'Plex Mono';src:url('file://${FONTS}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2');font-weight:500}
html,body{margin:0;background:${C.bg}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${s}</svg>`;
  writeFileSync(`${tmp}/${name}.html`, html);
  await page.setViewportSize({ width: W, height: H });
  await page.goto(`file://${tmp}/${name}.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${ROOT}/public/shots/gtm-chart-${name}.png` });
  console.log(`public/shots/gtm-chart-${name}.png  ${W}x${H}`);
}
await browser.close();
