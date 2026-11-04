// Records a ~100 s captioned walkthrough of the real app. Usage: node scripts/walkthrough.mjs  (dev server on :5288)
// Output: docs/videos/walkthrough.webm (+ .mp4 via ffmpeg). Captions are Ayo's words; numbers come from the data files.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = process.env.BASE ?? 'http://127.0.0.1:5288/';
const W = 1440, H = 900;
const blind1 = JSON.parse(readFileSync('src/data/eval-results-holdout-first-run.json', 'utf8')).overall;
const blind2 = existsSync('src/data/eval-results-holdout2-first-run.json') ? JSON.parse(readFileSync('src/data/eval-results-holdout2-first-run.json', 'utf8')).overall : null;
const pct = s => Math.round((100 * s.tp) / (s.tp + s.fn));
const blindLine = blind2
  ? `Then blind tests by agents that never saw the code. First run: ${pct(blind1.subscriptions)}% found. After fixes, a fresh blind set: ${pct(blind2.subscriptions)}% found, every price exact. Both first runs are on the page.`
  : `Then a blind test by an agent that never saw the code. First run: ${pct(blind1.subscriptions)}% found. I fixed what it exposed, and I show both numbers.`;

mkdirSync('docs/videos/tmp', { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: 'docs/videos/tmp', size: { width: W, height: H } } });
const page = await ctx.newPage();
const wait = ms => page.waitForTimeout(ms);

async function overlay() {
  await page.evaluate(() => {
    if (document.getElementById('cap')) return;
    const c = document.createElement('div');
    c.id = 'cap';
    c.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:980px;background:rgba(31,27,22,.92);color:#fdfbf7;font:500 22px/30px "Instrument Sans",system-ui;padding:14px 22px;border-radius:12px;z-index:9999;transition:opacity .25s;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.18)';
    document.body.appendChild(c);
  });
}
async function say(text, ms) {
  await overlay();
  await page.evaluate(t => { const c = document.getElementById('cap'); c.style.opacity = '0'; setTimeout(() => { c.textContent = t; c.style.opacity = '1'; }, 180); }, text);
  await wait(ms);
}
async function to(sel, offset = 80) {
  await page.evaluate(([s, o]) => { const el = document.querySelector(s); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - o, behavior: 'smooth' }); }, [sel, offset]);
  await wait(900);
}
async function go(hash) { await page.evaluate(h => { location.hash = h; }, hash); await wait(700); await overlay(); }

await page.goto(base + '#/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await wait(500);
await say("Nous's ads all sell energy. 0 of 1,268 open with subscriptions. So I built the subscriptions bit.", 5200);
await say('A sample statement. The highlighter marks exactly what the rules flagged. Nothing here is typed by hand.', 4800);
await to('.catch-list', 140);
await say('Eight checks, each one a rule you can read: duplicates, price rises, trials that became bills, renewals.', 5200);
await to('.households', 140);
await say('Three made-up households, three different bank export formats.', 3800);
await go('/sweep/priya');
await say('Priya: 446 payments, 9 subscriptions, £506 a year worth a look.', 4800);
await to('.flags', 100);
await say("Every flag leads with the monthly cost. That's how members think: \"I only care about my monthly outgoings.\"", 5600);
await to('.phone', 90);
await say('One message. Three items, max. Nothing gets cancelled without a yes for that one.', 5200);
await to('.chart-card', 90);
await say("What she's signed up to each month: £89 to £117. The creep, in one picture.", 4800);
await to('.table-card', 90);
await say('Every subscription, named by the rules, by AI, or flagged as unnamed.', 4200);
await go('/sweep/okafor');
await to('.flags', 100);
await say('The Okafors: charged twice by Disney+, paying for two Netflix plans, and an Amazon Prime renewal due.', 5600);
await go('/sweep/tom');
await to('.flags', 100);
await say('Tom: two AI assistants, two delivery memberships, and a free trial that just became £8.99 a month.', 5200);
await go('/how');
await say('Rules own every pound. The AI only says what a merchant is.', 4200);
await to('.callout', 120);
await say("Under 60% sure, its answer is thrown away. It never sees an amount, so it can't get one wrong.", 5200);
await go('/accuracy');
await say('Scored against an answer key on every change.', 3800);
await to('h2:nth-of-type(3)', 100);
await page.evaluate(() => { const h = [...document.querySelectorAll('h2')].find(x => /Blind test/.test(x.textContent)); if (h) window.scrollTo({ top: h.getBoundingClientRect().top + scrollY - 100, behavior: 'smooth' }); });
await wait(900);
await say(blindLine, 7000);
await go('/sweep/yours');
await say("Or drop in your own statement. It's read on your device. Never uploaded.", 3200);
const unseen = existsSync('src/data/holdout2/holdout2-a.csv') ? 'src/data/holdout2/holdout2-a.csv' : 'src/data/holdout/holdout-a.csv';
await page.setInputFiles('[data-testid=file-input]', unseen);
await wait(600);
await overlay();
await say('This is a household another agent wrote, with traps I never saw. Read in under a second.', 4600);
await to('.flags', 100);
await say('Same rules, same message, a stranger\u2019s bank file.', 3600);
await say('The PRD, the build log and a one-page memo are all in here.', 1200);
await go('/docs/memo');
await wait(3000);
await page.evaluate(() => {
  const e = document.createElement('div');
  e.style.cssText = 'position:fixed;inset:0;background:#1f1b16;color:#fdfbf7;display:grid;place-content:center;text-align:center;z-index:10000;font-family:"Instrument Sans",system-ui;opacity:0;transition:opacity .5s';
  e.innerHTML = '<div style="font-size:56px;letter-spacing:-0.03em;font-weight:500">Subscription Sweep</div><div style="font-size:22px;margin-top:16px;color:#c9c1b4">Built by Ayo Ahmed for Nous’s Product Builder role</div><div style="margin:28px auto 0;width:120px;height:10px;border-radius:5px;background:#5ee094"></div>';
  document.body.appendChild(e); requestAnimationFrame(() => { e.style.opacity = '1'; });
  document.getElementById('cap')?.remove();
});
await wait(4200);
await ctx.close();
await browser.close();

const vid = readdirSync('docs/videos/tmp').find(f => f.endsWith('.webm'));
renameSync(`docs/videos/tmp/${vid}`, 'docs/videos/walkthrough.webm');
rmSync('docs/videos/tmp', { recursive: true, force: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'docs/videos/walkthrough.webm', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', 'docs/videos/walkthrough.mp4']);
console.log('saved docs/videos/walkthrough.mp4');
