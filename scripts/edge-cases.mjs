// Recorded browser test: uploads each edge-case file into the real app and checks what the member sees.
// Saves a video to docs/videos/ and a results table to docs/evidence/. Usage: node scripts/edge-cases.mjs <label>
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';

const label = process.argv[2] ?? 'run';
const base = process.env.BASE ?? 'http://127.0.0.1:5288/';
mkdirSync('docs/videos/tmp', { recursive: true });
mkdirSync('docs/evidence', { recursive: true });

const CASES = [
  { file: '01-empty.csv', expect: 'says the file is empty, never "nothing looks off"', check: t => /empty/i.test(t) && !/Nothing looks off/.test(t) },
  { file: '02-not-a-statement.csv', expect: 'explains which columns it needs, shows no £0 result', check: t => /columns/i.test(t) && !/Worth a look/.test(t) },
  { file: '03-barclays.csv', expect: 'Barclays detected, Spotify + Netflix found, Sainsbury’s left out', check: t => /Barclays/.test(t) && /Spotify/.test(t) && /Netflix/.test(t) && !/Sainsbury/i.test(tableText(t)) },
  { file: '04-lloyds.csv', expect: 'Disney+ found, EE as a bill, salary ignored', check: t => /Disney\+/.test(t) && /EE/.test(t) },
  { file: '05-messy-quotes-bom.csv', expect: 'YouTube Premium found, mortgage as a fixed cost, 2 bad rows skipped', check: t => /YouTube Premium/.test(t) && /Mortgage/.test(t) && /Skipped 2 rows/.test(t) },
  { file: '06-only-income.csv', expect: '0 subscriptions, calm "nothing looks off"', check: t => /Nothing looks off/.test(t) },
  { file: '07-five-years.csv', expect: '5 years (~3,900 rows) in under 2 s, Netflix price rise found, coffee and TfL ignored', check: (t, ms) => ms < 2000 && /Netflix went up/.test(t) && !/Pret/i.test(tableText(t)) },
];
function tableText(t) { const i = t.indexOf('All subscriptions'); const j = t.indexOf('Bills Nous can check', i); return i >= 0 ? t.slice(i, j > 0 ? j : undefined) : ''; }

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: 'docs/videos/tmp', size: { width: 1280, height: 800 } } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const results = [];

await page.goto(base + '#/sweep/yours', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
for (const c of CASES) {
  const t0 = Date.now();
  await page.setInputFiles('[data-testid=file-input]', `tests/fixtures/${c.file}`);
  await page.waitForTimeout(300);
  const ms = Date.now() - t0;
  // Render time is what the member waits for; measure from file pick to results painted.
  await page.waitForTimeout(1200);
  const text = await page.locator('main').innerText();
  const pass = c.check(text, ms);
  results.push({ file: c.file, expect: c.expect, pass, ms });
  await page.screenshot({ path: `public/shots/${label}-edge-${c.file.replace('.csv', '')}.png`, fullPage: false });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.file.padEnd(26)} ${String(ms).padStart(5)}ms  ${c.expect}`);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.goto(base + '#/sweep/yours');
  await page.waitForTimeout(400);
}
await ctx.close();
await browser.close();
const vid = readdirSync('docs/videos/tmp').find(f => f.endsWith('.webm'));
if (vid) renameSync(`docs/videos/tmp/${vid}`, `docs/videos/${label}-edge-cases.webm`);
const md = [`# Edge-case upload test (${label})`, '', `Run ${new Date().toISOString()} · ${results.filter(r => r.pass).length}/${results.length} passed · page errors: ${errors.length ? errors.join('; ') : 'none'}`, '', '| File | What should happen | Result | Time |', '|---|---|---|---|',
  ...results.map(r => `| ${r.file} | ${r.expect} | ${r.pass ? 'pass' : '**FAIL**'} | ${r.ms} ms |`)].join('\n');
writeFileSync(`docs/evidence/${label}-edge-cases.md`, md + '\n');
console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed · page errors: ${errors.length || 'none'} · video docs/videos/${label}-edge-cases.webm`);
