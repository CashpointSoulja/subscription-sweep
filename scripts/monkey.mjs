// Random-use test: clicks, taps, scrolls, resizes, back/forward and uploads at random, checking for crashes,
// console errors, blank pages and sideways scroll after every step. Seeded, so a failure can be replayed.
// Usage: BASE=http://127.0.0.1:5289/ node scripts/monkey.mjs <steps> <seed> [seed ...]
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:5289/';
const steps = +(process.argv[2] ?? 200);
const seeds = process.argv.slice(3).length ? process.argv.slice(3).map(Number) : [1, 2, 3];
const fixtures = readdirSync('tests/fixtures').map(f => `tests/fixtures/${f}`);
const SIZES = [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 740]];
let failures = 0;

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
for (const seed of seeds) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = a => a[Math.floor(rnd() * a.length)];
  // Even seeds start on a phone (touch), odd seeds on a laptop.
  const [w0, h0] = seed % 2 === 0 ? [390, 844] : [1280, 800];
  const ctx = await browser.newContext({ viewport: { width: w0, height: h0 }, isMobile: w0 < 500, hasTouch: w0 < 500 });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(`page error: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  const log = [];
  for (let i = 0; i < steps; i++) {
    const r = rnd();
    let did = '';
    try {
      if (r < 0.5) {
        const els = await page.$$('main a[href^="#"], main button:not([disabled]), .nav a, .subbar a, th button, .bar-col');
        const vis = [];
        for (const e of els) if (await e.isVisible()) vis.push(e);
        if (vis.length) {
          const el = pick(vis);
          did = `click ${(await el.innerText().catch(() => '')).slice(0, 24).replace(/\n/g, ' ') || await el.evaluate(e => e.className)}`;
          await el.click({ timeout: 2000, noWaitAfter: true }).catch(() => {});
        }
      } else if (r < 0.65) {
        const y = Math.floor(rnd() * 4000);
        did = `scroll ${y}`;
        await page.evaluate(y => scrollTo(0, y), y);
      } else if (r < 0.72) {
        const [w, h] = pick(SIZES);
        did = `resize ${w}x${h}`;
        await page.setViewportSize({ width: w, height: h });
      } else if (r < 0.8) {
        did = rnd() < 0.5 ? 'back' : 'forward';
        await (did === 'back' ? page.goBack({ timeout: 2000 }) : page.goForward({ timeout: 2000 })).catch(() => {});
      } else if (r < 0.9) {
        const input = page.locator('[data-testid=file-input], [data-testid=add-file-input]').first();
        if (await input.count()) {
          const files = rnd() < 0.25 ? [pick(fixtures), pick(fixtures)] : [pick(fixtures)];
          did = `upload ${files.map(f => f.split('/').pop()).join(' + ')}`;
          await input.setInputFiles(files);
        } else {
          did = 'go #/sweep/yours';
          await page.goto(base + '#/sweep/yours');
        }
      } else {
        const route = pick(['/', '/sweep/priya', '/sweep/okafor', '/sweep/tom', '/sweep/yours', '/how', '/accuracy', '/docs/memo', '/docs/PRD', '/docs/build-log', '/sweep/zzz', '/qq']);
        did = `go #${route}`;
        await page.goto(base + '#' + route);
      }
      await page.waitForTimeout(60 + Math.floor(rnd() * 400));
      const state = await page.evaluate(() => {
        const over = document.documentElement.scrollWidth - innerWidth;
        // Name the element that sticks out, so a failure says what to fix.
        let culprit = '';
        if (over > 0) {
          let worst = 0;
          // Skip things inside a box that scrolls or clips sideways (the table): they can't widen the page.
          const clipped = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true; return false; };
          for (const el of document.querySelectorAll('body *')) {
            if (clipped(el)) continue;
            const r = el.getBoundingClientRect().right;
            if (r > innerWidth + 1 && r > worst && el.getClientRects().length) { worst = r; culprit = `${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')} right=${Math.round(r)}`; }
          }
        }
        return { over, culprit, main: document.querySelector('main')?.innerText.trim().length ?? 0 };
      });
      if (state.over > 0) problems.push(`step ${i} (${did}): ${state.over}px sideways scroll at ${page.viewportSize().width}px · ${state.culprit} · ${await page.evaluate(() => location.hash)}`);
      if (state.main < 10) problems.push(`step ${i} (${did}): main area is blank`);
    } catch (e) {
      problems.push(`step ${i} (${did}): ${e.message.split('\n')[0]}`);
    }
    log.push(did);
  }
  const uniq = [...new Set(problems)];
  failures += uniq.length;
  console.log(`seed ${seed}: ${steps} steps, ${uniq.length ? uniq.length + ' PROBLEMS' : 'no problems'}  (${log.filter(l => l.startsWith('upload')).length} uploads, ${log.filter(l => l.startsWith('resize')).length} resizes, ${log.filter(l => l.startsWith('click')).length} clicks)`);
  uniq.slice(0, 12).forEach(p => console.log('   ' + p));
  await ctx.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
