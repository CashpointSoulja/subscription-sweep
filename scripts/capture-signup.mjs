// Captures Nous's public sign-up screens (no details entered, nothing submitted).
import { chromium } from 'playwright-core';
const out = 'research/signup';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
await page.goto('https://www.nous.co/', { waitUntil: 'networkidle' }).catch(()=>{});
await page.waitForTimeout(2000); await page.screenshot({ path: `${out}/01-homepage.png` });
await page.goto('https://app.nous.co/signup', { waitUntil: 'networkidle' }).catch(()=>{});
const ok = await page.waitForSelector('input, button[type=submit], [role=button]', { timeout: 20000 }).then(()=>true).catch(()=>false);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/02-signup.png` });
console.log('form found:', ok, '| url:', page.url());
console.log((await page.locator('body').innerText()).slice(0, 1200));
console.log(JSON.stringify(await page.$$eval('input,select,textarea,button', els => els.map(e => [e.tagName, e.type, e.name || e.getAttribute('aria-label') || e.placeholder, (e.innerText||'').trim().slice(0,50)]))));
await browser.close();
