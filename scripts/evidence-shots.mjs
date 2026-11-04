// Evidence screenshots for the build log: moments a plain page screenshot can't catch.
// Usage: BASE=http://127.0.0.1:5289/ node scripts/evidence-shots.mjs <label>
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const label = process.argv[2] ?? 'evidence';
const base = process.env.BASE ?? 'http://127.0.0.1:5289/';
const out = name => `public/shots/${label}-${name}.png`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const errors = [];
const open = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { ctx, page };
};
const settle = async page => { await page.waitForTimeout(150); await page.waitForFunction(() => !document.querySelector('.sweeping'), null, { timeout: 20000 }); await page.waitForTimeout(500); };

// 1. A flag card opened: the payments behind it.
{
  const { ctx, page } = await open({ reducedMotion: 'reduce' });
  await page.goto(base + '#/sweep/okafor', { waitUntil: 'networkidle' });
  await page.locator('.flag-toggle', { hasText: 'Netflix' }).first().click();
  await page.waitForTimeout(400);
  await page.locator('.flag-card.open').scrollIntoViewIfNeeded();
  const box = await page.locator('.results').boundingBox();
  await page.screenshot({ path: out('flag-open'), clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: Math.min(box.height + 16, 900) } });
  console.log('saved', out('flag-open'));
  await ctx.close();
}

// 2. The reading animation, caught mid-way (normal motion).
{
  const { ctx, page } = await open();
  await page.goto(base + '#/sweep/yours', { waitUntil: 'networkidle' });
  await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/07-five-years.csv');
  await page.waitForSelector('.sweeping');
  await page.waitForTimeout(450);
  await page.screenshot({ path: out('reading') });
  console.log('saved', out('reading'));
  await ctx.close();
}

// 3. Drag a file anywhere: the overlay.
{
  const { ctx, page } = await open();
  await page.goto(base + '#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['Date,Description,Amount'], 'statement.csv', { type: 'text/csv' }));
    document.body.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('drop-anywhere') });
  console.log('saved', out('drop-anywhere'));
  await ctx.close();
}

// 4. One month only: the "too short" warning instead of an all-clear.
// 5. Amex credit card + Revolut together: the notes explain how each was read.
for (const [name, files] of [['one-month', ['tests/fixtures/14-one-month.csv']], ['amex-plus-revolut', ['tests/fixtures/10-amex-credit-card.csv', 'tests/fixtures/11-revolut.csv']]]) {
  const { ctx, page } = await open({ reducedMotion: 'reduce' });
  await page.goto(base + '#/sweep/yours', { waitUntil: 'networkidle' });
  await page.setInputFiles('[data-testid=file-input]', files);
  await settle(page);
  await page.screenshot({ path: out(name) });
  console.log('saved', out(name));
  await ctx.close();
}

// 6. Phone: the pinned household bar while scrolled down, and a flag opened.
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await page.goto(base + '#/sweep/okafor', { waitUntil: 'networkidle' });
  await page.locator('.flag-toggle').first().tap();
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollTo(0, 420));
  await page.waitForTimeout(200);
  await page.screenshot({ path: out('phone-pinned-bar') });
  console.log('saved', out('phone-pinned-bar'));
  await ctx.close();
}

// 7. The link preview image (1200 x 630): the landing hero, finished state.
{
  const { ctx, page } = await open({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce' });
  await page.goto(base + '#/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'public/og.png' });
  console.log('saved public/og.png');
  await ctx.close();
}

await browser.close();
console.log(errors.length ? 'PROBLEMS: ' + errors.join(' | ') : 'no console errors');
void readFileSync;
