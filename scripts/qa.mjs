// The full browser QA run: stability (does anything jump?), interactions, every upload case, phone, reduced motion, accessibility.
// Usage: BASE=http://127.0.0.1:5289/ node scripts/qa.mjs <label>     Writes docs/evidence/<label>-qa.md and docs/videos/<label>-qa.webm
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, existsSync } from 'node:fs';

const label = process.argv[2] ?? 'qa';
const base = process.env.BASE ?? 'http://127.0.0.1:5289/';
const SCRATCH = process.env.SCRATCH ?? 'docs/videos/tmp';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync('docs/videos/tmp', { recursive: true });
mkdirSync('docs/evidence', { recursive: true });

const checks = [];
const check = (area, name, pass, detail = '') => { checks.push({ area, name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  [${area}] ${name}${detail ? '  · ' + detail : ''}`); };
const errors = [];
const watch = (page, tag) => {
  page.on('pageerror', e => errors.push(`${tag} page error: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text()}`); });
};
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const text = page => page.locator('main').innerText();
const rect = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(v => Math.round(v * 10) / 10); }, sel);
const same = (a, b, tol = 0.6) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= tol);
const shiftObserver = () => {
  window.__shifts = [];
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__shifts.push({ v: e.value, t: e.startTime, input: e.hadRecentInput, who: (e.sources ?? []).map(s => s.node?.className || s.node?.nodeName).join(',') }))).observe({ type: 'layout-shift', buffered: true });
  window.__long = [];
  try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: true }); } catch { /* not supported */ }
};
const tabs = ['The Okafors', 'Tom', 'Your file', 'Priya', 'Tom', 'The Okafors', 'Priya'];
const tabSel = name => `.subbar .seg a:text-is("${name}")`;

// Protected Vercel previews: send the short-lived login token (from `vercel env run`) as a header. Never printed.
const auth = process.env.VERCEL_OIDC_TOKEN && /vercel\.app/.test(base) ? { extraHTTPHeaders: { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN } } : {};
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ── A + B + C: desktop, normal motion, recorded ──
{
  const ctx = await browser.newContext({ ...auth, viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'docs/videos/tmp', size: { width: 1440, height: 900 } } });
  await ctx.addInitScript(shiftObserver);
  const page = await ctx.newPage();
  watch(page, 'desktop');
  await page.goto(base + '#/sweep/priya', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const loadShift = await page.evaluate(() => window.__shifts.filter(s => !s.input).reduce((a, s) => a + s.v, 0));
  check('stability', 'Layout shift while the page loads (CLS)', loadShift < 0.05, loadShift.toFixed(4));

  for (const name of tabs) {
    const before = { bar: await rect(page, '.subbar .seg'), nav: await rect(page, '.nav'), h1: await rect(page, '.page-head h1'), w: await page.evaluate(() => document.documentElement.clientWidth), y: await page.evaluate(() => scrollY) };
    const t0 = await page.evaluate(() => performance.now());
    await page.click(tabSel(name));
    await page.waitForTimeout(120);
    const mid = await rect(page, '.subbar .seg');
    await page.waitForTimeout(2600);
    const after = { bar: await rect(page, '.subbar .seg'), nav: await rect(page, '.nav'), h1: await rect(page, '.page-head h1'), w: await page.evaluate(() => document.documentElement.clientWidth), y: await page.evaluate(() => scrollY) };
    const late = await page.evaluate(t => window.__shifts.filter(s => s.t > t + 700), t0);
    const pill = await rect(page, '.subbar .seg-pill'), cur = await rect(page, '.subbar .seg a[aria-current="page"]');
    check('stability', `→ ${name}: household bar didn't move (during and after)`, same(before.bar, mid) && same(before.bar, after.bar), JSON.stringify(after.bar));
    check('stability', `→ ${name}: nav, title position, page width and scroll unchanged`, same(before.nav, after.nav) && Math.abs(before.h1[1] - after.h1[1]) < 1 && before.w === after.w && before.y === after.y, `title y ${before.h1[1]}→${after.h1[1]}, width ${before.w}→${after.w}, scroll ${before.y}→${after.y}`);
    check('stability', `→ ${name}: nothing moved later than 0.7 s after the click`, late.length === 0, late.length ? late.map(s => `${s.v.toFixed(4)} ${s.who}`).join('; ') : '0 late shifts');
    check('stability', `→ ${name}: highlight pill sits on the current tab`, !!pill && !!cur && Math.abs(pill[0] - cur[0]) < 1 && Math.abs(pill[2] - cur[2]) < 1);
    if (await overflow(page) > 0) check('stability', `→ ${name}: no sideways scroll`, false, `${await overflow(page)}px`);
  }

  // Scrolled far down, switch household: the bar stays pinned and the page glides back to the new totals.
  await page.evaluate(() => scrollTo(0, 1500));
  await page.waitForTimeout(300);
  await page.click(tabSel('Tom'));
  await page.waitForTimeout(150);
  const pinned = await rect(page, '.subbar');
  await page.waitForTimeout(1300);
  check('stability', 'Switching while scrolled down: bar stays pinned, page glides back to the top', pinned && Math.abs(pinned[1] - 60) < 1 && (await page.evaluate(() => scrollY)) === 0, `bar y ${pinned?.[1]}, scroll ${await page.evaluate(() => scrollY)}`);

  // ── B. interactions ──
  await page.click(tabSel('Priya'));
  await page.waitForTimeout(2400);
  const toggle = page.locator('.flag-toggle').first();
  await toggle.click();
  await page.waitForTimeout(600);
  const openH = (await rect(page, '.flag-card.open .flag-more'))?.[3] ?? 0;
  const evText = await page.locator('.flag-card.open .ev').first().innerText().catch(() => '');
  check('interactions', 'Flag card opens to show the payments behind it', openH > 60 && (await toggle.getAttribute('aria-expanded')) === 'true' && /Bank text/.test(evText), `height ${openH}px`);
  await toggle.click();
  await page.waitForTimeout(600);
  const shutH = (await rect(page, '.flag-card .flag-more'))?.[3] ?? 99;
  check('interactions', 'Flag card closes again', shutH < 1 && (await toggle.getAttribute('aria-expanded')) === 'false', `height ${shutH}px`);
  await page.keyboard.press('Tab'); // focus moves on from the toggle without errors

  await page.click('th button:text-is("Service")');
  await page.waitForTimeout(300);
  const names = await page.$$eval('.table-card tbody tr:not(.ended) td:first-child', tds => tds.map(td => td.firstElementChild?.textContent?.toLowerCase() ?? ''));
  check('interactions', 'Table sorts by name', names.join() === [...names].sort().join() && (await page.getAttribute('th:has(button:text-is("Service"))', 'aria-sort')) === 'ascending', names.slice(0, 4).join(', '));
  await page.click('th button:text-is("Price")');
  await page.waitForTimeout(300);
  const prices = await page.$$eval('.table-card tbody tr:not(.ended) td:nth-child(4)', tds => tds.map(td => +td.textContent.replace(/[£,]/g, '')));
  check('interactions', 'Table sorts by price, highest first', prices.every((p, i) => i === 0 || p <= prices[i - 1]), prices.slice(0, 4).join(', '));

  await page.locator('.bar-col').nth(3).hover();
  await page.waitForTimeout(300);
  check('interactions', 'Hovering a chart bar shows that month', await page.locator('.bar-col').nth(3).locator('.bar-val.on').count() === 1);

  await page.evaluate(() => scrollTo(0, 0));
  await page.focus(tabSel('Priya'));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  check('interactions', 'Right arrow on the household bar moves to the next household, focus follows', (await page.evaluate(() => location.hash)) === '#/sweep/okafor' && (await page.evaluate(() => document.activeElement?.textContent)) === 'The Okafors');
  await page.goBack();
  await page.waitForTimeout(900);
  check('interactions', 'Browser Back returns to the previous household', (await page.evaluate(() => location.hash)) === '#/sweep/priya' && /Priya's sweep/.test(await text(page)));

  for (const [route, want, title] of [['/sweep/tom', /Tom's sweep/, "Tom's sweep · Subscription Sweep"], ['/sweep/nobody', /No such household/, 'Not found · Subscription Sweep'], ['/nope', /That page doesn't exist/, 'Not found · Subscription Sweep'], ['/how', /How it works/, 'How it works · Subscription Sweep'], ['/docs/PRD', /PRD/, 'PRD · Subscription Sweep']]) {
    await page.goto(base + '#' + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    check('interactions', `Deep link #${route} shows the right page and tab title`, want.test(await text(page)) && (await page.title()) === title, await page.title());
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  check('interactions', 'First Tab press focuses "Skip to content"', (await page.evaluate(() => document.activeElement?.textContent)) === 'Skip to content');

  // ── C. uploads ──
  const CASES = [
    ['01-empty.csv', t => /empty/i.test(t) && !/Nothing looks off/.test(t), 'says the file is empty, never "nothing looks off"'],
    ['02-not-a-statement.csv', t => /columns/i.test(t) && !/Worth a look/.test(t), 'explains which columns it needs'],
    ['03-barclays.csv', t => /Barclays/.test(t) && /Spotify/.test(t) && /Netflix/.test(t), 'Barclays: Spotify and Netflix'],
    ['04-lloyds.csv', t => /Disney\+/.test(t) && /\bEE\b/.test(t), 'Lloyds: Disney+, EE as a bill'],
    ['05-messy-quotes-bom.csv', t => /YouTube Premium/.test(t) && /Mortgage/.test(t) && /Skipped 2 rows/.test(t), 'messy file: YouTube Premium, mortgage, 2 rows skipped'],
    ['06-only-income.csv', t => /Nothing looks off/.test(t), 'income only: calm "nothing looks off"'],
    ['07-five-years.csv', t => /Netflix went up/.test(t), 'five years: Netflix price rise'],
    ['08-hsbc-no-header.csv', t => /HSBC/.test(t) && /PureGym/.test(t) && /Netflix/.test(t), 'HSBC, no header row: PureGym and Netflix'],
    ['09-nationwide-windows-encoding.csv', t => /Spotify/.test(t) && /Vodafone/.test(t) && /Windows-1252/.test(t), 'Nationwide old encoding: Spotify, Vodafone'],
    ['10-amex-credit-card.csv', t => /Adobe/.test(t) && /Audible/.test(t) && /credit card/.test(t) && !/Received Thank You/.test(t), 'Amex: charges read as money out, repayment ignored'],
    ['11-revolut.csv', t => /Revolut/.test(t) && /Left out 2 declined/.test(t) && !/charged you twice/.test(t), 'Revolut: declined payments left out'],
    ['12-natwest.csv', t => /Sky/.test(t) && /Amazon Prime/.test(t), 'NatWest: Sky and Amazon Prime'],
    ['13-santander.txt', t => /NOW/.test(t) && /Octopus Energy/.test(t), 'Santander text file: NOW and Octopus'],
    ['14-one-month.csv', t => /only covers 26 days/.test(t) && /Not enough history/.test(t) && !/Nothing looks off/.test(t), 'one month: "too short" warning, not "nothing looks off"'],
    ['15-semicolons.csv', t => /Deezer/.test(t), 'semicolons: Deezer'],
    ['16-statement.pdf', t => /That's a PDF/.test(t) && !/Worth a look/.test(t), 'PDF: says how to get the CSV'],
    ['17-statement.xlsx', t => /spreadsheet/.test(t) && !/Worth a look/.test(t), 'Excel: says to save as CSV'],
  ];
  const settle = async () => { await page.waitForTimeout(150); await page.waitForFunction(() => !document.querySelector('.sweeping'), null, { timeout: 20000 }); await page.waitForTimeout(500); };
  const reset = async () => {
    await page.goto(base + '#/sweep/yours', { waitUntil: 'networkidle' });
    if (await page.locator('button:has-text("Start over")').count()) await page.click('button:has-text("Start over")');
    await page.waitForTimeout(300);
  };
  for (const [file, ok, what] of CASES) {
    await reset();
    const t0 = Date.now();
    await page.setInputFiles('[data-testid=file-input]', `tests/fixtures/${file}`);
    const sawSweeping = await page.locator('.sweeping').count().catch(() => 0);
    await settle();
    const t = await text(page);
    check('uploads', `${file}: ${what}`, ok(t) && (await overflow(page)) <= 0, `${Date.now() - t0} ms${sawSweeping ? ', reading animation shown' : ''}`);
  }
  await reset();
  await page.setInputFiles('[data-testid=file-input]', ['tests/fixtures/03-barclays.csv', 'tests/fixtures/10-amex-credit-card.csv']);
  await settle();
  let t = await text(page);
  check('uploads', 'Two files at once (current account + credit card) are merged', /2 files/.test(t) && /Spotify/.test(t) && /Adobe/.test(t) && (await page.locator('.file-chip').count()) === 2);
  await reset();
  await page.setInputFiles('[data-testid=file-input]', ['tests/fixtures/03-barclays.csv', 'tests/fixtures/03-barclays.csv']);
  await settle();
  t = await text(page);
  check('uploads', 'The same file twice counts each payment once (no fake "charged twice")', /in more than one file, so counted once/.test(t) && !/charged you twice/.test(t));
  await reset();
  await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/03-barclays.csv');
  await settle();
  await page.setInputFiles('[data-testid=add-file-input]', 'tests/fixtures/11-revolut.csv');
  await settle();
  t = await text(page);
  check('uploads', '"Add another file" adds to what is already there', (await page.locator('.file-chip').count()) === 2 && /Netflix/.test(t) && /Disney\+/.test(t));
  await page.click('button:has-text("Start over")');
  await page.waitForTimeout(400);
  check('uploads', '"Start over" clears everything', /Nothing uploaded yet/.test(await text(page)));
  await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/03-barclays.csv');
  await settle();
  await page.click('button:has-text("Start over")');
  await page.waitForTimeout(300);
  await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/03-barclays.csv');
  await settle();
  check('uploads', 'Picking the same file again after starting over still works', /Barclays/.test(await text(page)));

  const big = process.env.BIG_FILE;
  if (big && existsSync(big)) {
    await reset();
    await page.evaluate(() => { window.__long = []; });
    const t0 = Date.now();
    await page.setInputFiles('[data-testid=file-input]', big);
    await settle();
    const ms = Date.now() - t0, longest = Math.max(0, ...(await page.evaluate(() => window.__long)));
    check('uploads', '100,000-payment file: finishes, and the page never freezes for long', /payments read/.test(await text(page)) && ms < 8000 && longest < 400, `${ms} ms total, longest freeze ${Math.round(longest)} ms`);
  }
  await reset();
  await page.evaluate(() => {
    const input = document.querySelector('[data-testid=file-input]');
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(26 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  check('uploads', 'A file over 25MB gets a clear message', /over 25MB/.test(await text(page)));

  await page.goto(base + '#/', { waitUntil: 'networkidle' });
  const csv = readFileSync('tests/fixtures/12-natwest.csv', 'utf8');
  const overlayOn = await page.evaluate(async body => {
    const dt = new DataTransfer();
    dt.items.add(new File([body], 'dropped-natwest.csv', { type: 'text/csv' }));
    document.querySelector('.hero h1').dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 350));
    const on = document.querySelector('.drop-overlay').classList.contains('on');
    document.querySelector('.drop-overlay').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    return on;
  }, csv);
  await settle();
  check('uploads', 'Drag a file anywhere on the home page: overlay shows, drop sweeps it', overlayOn && (await page.evaluate(() => location.hash)) === '#/sweep/yours' && /dropped-natwest\.csv/.test(await text(page)));

  await ctx.close();
}

// ── D. phone, normal motion ──
{
  const ctx = await browser.newContext({ ...auth, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(shiftObserver);
  const page = await ctx.newPage();
  watch(page, 'phone');
  await page.goto(base + '#/sweep/priya', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2400);
  for (const name of ['The Okafors', 'Tom', 'Your file', 'Priya']) {
    const before = await rect(page, '.subbar .seg');
    const t0 = await page.evaluate(() => performance.now());
    await page.tap(tabSel(name));
    await page.waitForTimeout(2500);
    const late = await page.evaluate(t => window.__shifts.filter(s => s.t > t + 700), t0);
    check('phone', `→ ${name}: bar fixed, nothing moved late, no sideways scroll`, same(before, await rect(page, '.subbar .seg'), 1) && late.length === 0 && (await overflow(page)) <= 0, late.map(s => s.who).join('; '));
  }
  const navOneLine = await page.evaluate(() => { const l = document.querySelector('.logo'); const a = document.querySelector('.nav-links a.keep'); return l.getBoundingClientRect().height < 30 && a.getBoundingClientRect().height < 40; });
  check('phone', 'Top bar fits on one line', navOneLine);
  await page.tap('.flag-toggle >> nth=0');
  await page.waitForTimeout(600);
  check('phone', 'Tap a flag card to open it, no sideways scroll', (await page.locator('.flag-card.open').count()) === 1 && (await overflow(page)) <= 0);
  // Found by the random-use test: a long file name made the report wider than a phone.
  await page.goto(base + '#/sweep/yours', { waitUntil: 'networkidle' });
  await page.setInputFiles('[data-testid=file-input]', { name: 'Statement_Current_Account_01-11-2025_to_31-10-2026_export.csv', mimeType: 'text/csv', buffer: readFileSync('tests/fixtures/03-barclays.csv') });
  await page.waitForTimeout(200);
  await page.waitForFunction(() => !document.querySelector('.sweeping'), null, { timeout: 20000 });
  await page.waitForTimeout(400);
  check('phone', 'A very long file name never makes the page scroll sideways', (await overflow(page)) <= 0 && /Barclays/.test(await text(page)), `${await overflow(page)}px`);
  for (const r of ['/', '/how', '/accuracy', '/docs/build-log', '/sweep/yours']) {
    await page.goto(base + '#' + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const o = await overflow(page);
    check('phone', `${r}: no sideways scroll`, o <= 0, o > 0 ? `${o}px` : '');
  }
  await ctx.close();
}

// ── E. reduced motion ──
{
  const ctx = await browser.newContext({ ...auth, viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  watch(page, 'reduced-motion');
  await page.goto(base + '#/sweep/okafor', { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const s = await page.evaluate(() => ({ bubbles: document.querySelectorAll('.bubble').length, shown: document.querySelectorAll('.bubble.shown').length, value: document.querySelector('.stat.lead .value [aria-hidden]')?.textContent }));
  check('reduced motion', 'Less-motion setting: message and numbers appear at once, no animation', s.bubbles > 0 && s.bubbles === s.shown && s.value === '£263', JSON.stringify(s));
  await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/03-barclays.csv').catch(async () => { await page.goto(base + '#/sweep/yours'); await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/03-barclays.csv'); });
  await page.waitForTimeout(800);
  check('reduced motion', 'Less-motion setting: upload result appears without the wait', /Barclays/.test(await text(page)));
  await ctx.close();
}

// ── F. accessibility (axe-core, serious and critical issues) ──
{
  // The site's security policy blocks injected scripts (good), so the checker's browser is told to ignore it.
  const ctx = await browser.newContext({ ...auth, viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', bypassCSP: true });
  const page = await ctx.newPage();
  for (const r of ['/', '/sweep/priya', '/sweep/yours', '/how', '/accuracy', '/docs/memo']) {
    await page.goto(base + '#' + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target?.join(' ')}`));
    check('accessibility', `${r}: no serious or critical issues`, v.length === 0, v.join(' | '));
  }
  await ctx.close();
}

await browser.close();
check('errors', 'No page errors or console errors anywhere in the run', errors.length === 0, errors.slice(0, 5).join(' | '));

const vid = readdirSync('docs/videos/tmp').filter(f => f.endsWith('.webm')).map(f => `docs/videos/tmp/${f}`)[0];
if (vid) renameSync(vid, `docs/videos/${label}-qa.webm`);
const passed = checks.filter(c => c.pass).length;
const md = [`# Browser QA run (${label})`, '', `Run ${new Date().toISOString()} against ${base} · **${passed}/${checks.length} checks passed**`, '',
  '| Area | Check | Result | Detail |', '|---|---|---|---|',
  ...checks.map(c => `| ${c.area} | ${c.name.replace(/\|/g, '/')} | ${c.pass ? 'pass' : '**FAIL**'} | ${String(c.detail).replace(/\|/g, '/').slice(0, 160)} |`)].join('\n');
writeFileSync(`docs/evidence/${label}-qa.md`, md + '\n');
console.log(`\n${passed}/${checks.length} passed · report docs/evidence/${label}-qa.md${vid ? ` · video docs/videos/${label}-qa.webm` : ''}`);
process.exit(passed === checks.length ? 0 : 1);
