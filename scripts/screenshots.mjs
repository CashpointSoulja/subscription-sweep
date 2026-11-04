// Screenshots every page at desktop and phone size, for the build log.
// Usage: node scripts/screenshots.mjs <label> [route ...]   (dev server on :5288)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const label = process.argv[2] ?? 'shot';
const routes = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/sweep/priya', '/sweep/okafor', '/sweep/tom', '/sweep/yours', '/how', '/accuracy', '/docs/memo'];
const base = process.env.BASE ?? 'http://127.0.0.1:5288/';
mkdirSync('public/shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const sizes = [{ name: 'desktop', viewport: { width: 1440, height: 900 }, scale: 1 }, { name: 'phone', viewport: { width: 390, height: 844 }, scale: 2, mobile: true }];
const errors = [];
for (const s of sizes) {
  // Reduced motion: shots show the finished page, not a frame mid-animation.
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.scale, isMobile: !!s.mobile, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${s.name}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${s.name} console: ${m.text()}`); });
  for (const r of routes) {
    await page.goto(base + '#' + r, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const slug = r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '-');
    await page.screenshot({ path: `public/shots/${label}-${slug}-${s.name}.png`, fullPage: true });
    // Horizontal overflow check: nothing should be wider than the viewport.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`${s.name} ${r}: page is ${overflow}px wider than the screen`);
    console.log(`saved ${label}-${slug}-${s.name}.png`);
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? 'PROBLEMS:\n' + errors.join('\n') : 'no console errors, no horizontal overflow');
