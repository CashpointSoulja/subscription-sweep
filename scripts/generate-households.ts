/**
 * Generates 3 synthetic households (12 months of payments each) plus an answer key.
 * The answer key is written from the spec below, NOT from the engine, so the eval is a real test.
 * Run: npm run generate
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { addDays, addMonths, toDay, fromDay } from '../src/engine/dates';

const START = '2025-11-01', END = '2026-10-31';

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Cad = 'weekly' | 'monthly' | 'yearly';
interface Stream {
  desc: string; amount: number; cadence: Cad; day?: number; start?: string; end?: string;
  rises?: { from: string; amount: number }[]; skip?: number; jitter?: number;
  truth?: { name: string; kind: 'subscription' | 'bill' | 'housing'; category?: string; ai?: boolean };
  income?: boolean;
}
interface Event { date: string; desc: string; amount: number; note: string }
interface Household {
  id: string; name: string; firstName: string; blurb: string; format: 'monzo' | 'nationwide' | 'starling'; seed: number;
  streams: Stream[]; events: Event[]; noise: (r: () => number) => Event[];
  expectFlags: { type: string; name: string; amount?: number }[];
  mustNotBeSubscription: string[];
}

const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
const money = (r: () => number, lo: number, hi: number) => Math.round((lo + r() * (hi - lo)) * 100) / 100;

function everyDays(from: string, to: string, step: number, r: () => number, f: (d: string) => Event | null): Event[] {
  const out: Event[] = [];
  for (let d = toDay(from); d <= toDay(to); d += step) { const e = f(fromDay(d + Math.floor(r() * 2))); if (e) out.push(e); }
  return out;
}

const HOUSEHOLDS: Household[] = [
  {
    id: 'priya', name: 'Priya', firstName: 'Priya', seed: 11, format: 'monzo',
    blurb: 'Renting a one-bed in Leeds. Busy job, signs up to things on her phone and forgets.',
    streams: [
      { desc: 'ACME HEALTH LTD SALARY', amount: -2450, cadence: 'monthly', day: 28, income: true },
      { desc: 'STO M OKONJO RENT', amount: 850, cadence: 'monthly', day: 1, truth: { name: 'Rent', kind: 'housing' } },
      { desc: 'LEEDS CITY COUNCIL CTAX', amount: 142, cadence: 'monthly', day: 15, truth: { name: 'Council tax', kind: 'housing' } },
      { desc: 'OCTOPUS ENERGY DD', amount: 96, cadence: 'monthly', day: 5, truth: { name: 'Octopus Energy', kind: 'bill' } },
      { desc: 'HYPEROPTIC LTD', amount: 30, cadence: 'monthly', day: 12, truth: { name: 'Hyperoptic', kind: 'bill' } },
      { desc: 'VODAFONE LTD', amount: 18, cadence: 'monthly', day: 20, truth: { name: 'Vodafone', kind: 'bill' } },
      { desc: 'NETFLIX.COM 866-579-7172', amount: 10.99, cadence: 'monthly', day: 9, rises: [{ from: '2026-07-01', amount: 12.99 }], truth: { name: 'Netflix', kind: 'subscription' } },
      { desc: 'SPOTIFY P2A4F8C1', amount: 11.99, cadence: 'monthly', day: 14, truth: { name: 'Spotify', kind: 'subscription' } },
      { desc: 'APPLE.COM/BILL', amount: 10.99, cadence: 'monthly', day: 22, start: '2026-02-01', truth: { name: 'Apple', kind: 'subscription', category: 'music' } },
      { desc: 'APPLE.COM/BILL', amount: 2.99, cadence: 'monthly', day: 3, truth: { name: 'Apple', kind: 'subscription', category: 'cloud' } },
      { desc: 'PAYPAL *DISNEYPLUS 35314369001', amount: 7.99, cadence: 'monthly', day: 17, truth: { name: 'Disney+', kind: 'subscription' } },
      { desc: 'PUREGYM LTD', amount: 24.99, cadence: 'monthly', day: 1, truth: { name: 'PureGym', kind: 'subscription' } },
      { desc: 'HEADSPACE.COM', amount: 49.99, cadence: 'yearly', start: '2025-11-20', truth: { name: 'Headspace', kind: 'subscription' } },
      { desc: 'HINGE', amount: 24.99, cadence: 'monthly', day: 9, start: '2026-09-09', truth: { name: 'Hinge', kind: 'subscription' } },
      { desc: 'NOWTV.COM', amount: 9.99, cadence: 'monthly', day: 25, end: '2026-03-31' }, // cancelled: must show as ended
      { desc: 'SQ *THE BREAD CLUB', amount: 16, cadence: 'monthly', day: 6, truth: { name: 'The Bread Club', kind: 'subscription', category: 'food-box', ai: true } },
    ],
    events: [
      { date: '2026-09-02', desc: 'HINGE', amount: 0, note: 'free trial start' },
      { date: '2026-01-08', desc: 'AMAZON.CO.UK*HK29S', amount: 9.99, note: 'one-off, same price twice' },
      { date: '2026-03-08', desc: 'AMAZON.CO.UK*7TQ1B', amount: 9.99, note: 'one-off, same price twice' },
    ],
    noise: r => [
      ...everyDays(START, END, 7, r, d => ({ date: d, desc: 'TESCO STORES 2041 LEEDS', amount: money(r, 28, 84), note: 'weekly shop' })),
      ...everyDays(START, END, 2, r, d => r() < 0.6 ? { date: d, desc: 'PRET A MANGER LEEDS', amount: pick(r, [3.1, 3.4, 4.85, 5.85]), note: 'coffee' } : null),
      ...everyDays(START, END, 9, r, d => ({ date: d, desc: 'UBER *TRIP HELP.UBER.COM', amount: money(r, 6, 22), note: 'taxi' })),
      ...everyDays(START, END, 13, r, d => ({ date: d, desc: 'AMZNMKTPLACE*' + Math.floor(r() * 1e5), amount: money(r, 5, 45), note: 'shopping' })),
      ...everyDays(START, END, 11, r, d => ({ date: d, desc: 'DELIVEROO', amount: money(r, 14, 32), note: 'takeaway' })),
    ],
    expectFlags: [
      { type: 'price-rise', name: 'Netflix' },
      { type: 'duplicate', name: 'Apple', amount: 10.99 },
      { type: 'renewal-soon', name: 'Headspace' },
      { type: 'trial-converted', name: 'Hinge' },
    ],
    mustNotBeSubscription: ['Groceries', 'Eating out', 'Transport', 'Shopping', 'NOW (active)'],
  },
  {
    id: 'okafor', name: 'The Okafors', firstName: 'Grace', seed: 23, format: 'nationwide',
    blurb: 'Family of four in Croydon. Two adults, two kids, a lot of logins.',
    streams: [
      { desc: 'NHS TRUST SALARY', amount: -2890, cadence: 'monthly', day: 26, income: true },
      { desc: 'CROYDON COLLEGE PAYROLL', amount: -1760, cadence: 'monthly', day: 28, income: true },
      { desc: 'NATIONWIDE MORTGAGE', amount: 1240, cadence: 'monthly', day: 1, truth: { name: 'Mortgage', kind: 'housing' } },
      { desc: 'LB CROYDON CTAX', amount: 198, cadence: 'monthly', day: 1, truth: { name: 'Council tax', kind: 'housing' } },
      { desc: 'TV LICENCE MBP', amount: 14.25, cadence: 'monthly', day: 1, truth: { name: 'TV Licence', kind: 'housing' } },
      { desc: 'THAMES WATER', amount: 38, cadence: 'monthly', day: 20, truth: { name: 'Water', kind: 'housing' } },
      { desc: 'BRITISH GAS', amount: 168, cadence: 'monthly', day: 8, truth: { name: 'British Gas', kind: 'bill' } },
      { desc: 'SKY DIGITAL', amount: 68, cadence: 'monthly', day: 25, rises: [{ from: '2026-04-01', amount: 74 }], truth: { name: 'Sky', kind: 'bill' } },
      { desc: 'EE LIMITED', amount: 32, cadence: 'monthly', day: 10, truth: { name: 'EE', kind: 'bill' } },
      { desc: 'EE LIMITED', amount: 22, cadence: 'monthly', day: 10, truth: { name: 'EE', kind: 'bill' } },
      { desc: 'ADMIRAL INSURANCE', amount: 61, cadence: 'monthly', day: 3, truth: { name: 'Admiral', kind: 'bill' } },
      { desc: 'AVIVA HOME INS', amount: 312, cadence: 'yearly', start: '2025-12-10', truth: { name: 'Aviva', kind: 'bill' } },
      { desc: 'NETFLIX.COM', amount: 18.99, cadence: 'monthly', day: 2, truth: { name: 'Netflix', kind: 'subscription' } },
      { desc: 'NETFLIX.COM', amount: 5.99, cadence: 'monthly', day: 19, start: '2026-01-01', truth: { name: 'Netflix', kind: 'subscription' } },
      { desc: 'DISNEY PLUS', amount: 12.99, cadence: 'monthly', day: 3, truth: { name: 'Disney+', kind: 'subscription' } },
      { desc: 'AMAZON PRIME*2B1QX', amount: 95, cadence: 'yearly', start: '2025-11-14', truth: { name: 'Amazon Prime', kind: 'subscription' } },
      { desc: 'PARAMOUNTPLUS.COM', amount: 6.99, cadence: 'monthly', day: 21, truth: { name: 'Paramount+', kind: 'subscription' } },
      { desc: 'GOOGLE *YOUTUBEPREMIUM', amount: 12.99, cadence: 'monthly', day: 26, truth: { name: 'YouTube Premium', kind: 'subscription' } },
      { desc: 'SPOTIFY', amount: 19.99, cadence: 'monthly', day: 14, truth: { name: 'Spotify', kind: 'subscription' } },
      { desc: 'MICROSOFT*XBOX', amount: 10.99, cadence: 'monthly', day: 15, rises: [{ from: '2026-07-01', amount: 12.99 }], truth: { name: 'Xbox Game Pass', kind: 'subscription' } },
      { desc: 'ROBLOX CORPORATION', amount: 4.99, cadence: 'monthly', day: 11, truth: { name: 'Roblox', kind: 'subscription', category: 'gaming', ai: true } },
      { desc: 'GOUSTO', amount: 38.99, cadence: 'weekly', start: '2025-11-04', skip: 0.15, truth: { name: 'Gousto', kind: 'subscription' } },
      { desc: 'BRITBOX', amount: 5.99, cadence: 'monthly', day: 12, end: '2026-01-31' }, // cancelled
    ],
    events: [
      { date: '2026-09-04', desc: 'DISNEY PLUS', amount: 12.99, note: 'charged twice, never refunded' },
      { date: '2026-05-15', desc: 'SPOTIFY', amount: 19.99, note: 'charged twice...' },
      { date: '2026-05-18', desc: 'SPOTIFY', amount: -19.99, note: '...then refunded (must NOT flag)' },
      { date: '2026-03-08', desc: 'BRITISH GAS', amount: -168, note: 'payment reversed' },
      { date: '2026-03-15', desc: 'BRITISH GAS', amount: 168, note: 'retried' },
    ],
    noise: r => [
      ...everyDays(START, END, 7, r, d => ({ date: d, desc: 'SAINSBURYS S/MKT 0921', amount: money(r, 82, 164), note: 'weekly shop' })),
      ...everyDays(START, END, 12, r, d => ({ date: d, desc: 'SHELL CROYDON 4410', amount: money(r, 45, 78), note: 'fuel' })),
      ...everyDays(START, END, 6, r, d => ({ date: d, desc: 'UBER *TRIP', amount: money(r, 8, 25), note: 'taxi' })),
      ...everyDays(START, END, 10, r, d => ({ date: d, desc: 'AMZNMKTPLACE*' + Math.floor(r() * 1e5), amount: money(r, 6, 60), note: 'shopping' })),
      ...everyDays(START, END, 15, r, d => ({ date: d, desc: 'JUST EAT', amount: money(r, 22, 48), note: 'takeaway' })),
    ],
    expectFlags: [
      { type: 'duplicate', name: 'Netflix', amount: 5.99 },
      { type: 'double-charge', name: 'Disney+' },
      { type: 'renewal-soon', name: 'Amazon Prime' },
      { type: 'stack', name: 'Netflix' },
      { type: 'price-rise', name: 'Xbox Game Pass' },
      { type: 'price-rise', name: 'Sky' },
    ],
    mustNotBeSubscription: ['Groceries', 'Transport', 'Shopping', 'Eating out', 'BritBox (active)'],
  },
  {
    id: 'tom', name: 'Tom', firstName: 'Tom', seed: 37, format: 'starling',
    blurb: 'Flatshare in Manchester. Tries every new app, splits bills with his flatmate.',
    streams: [
      { desc: 'BRIGHTLOOP LTD SALARY', amount: -2100, cadence: 'monthly', day: 25, income: true },
      { desc: 'STO S WARD RENT', amount: 650, cadence: 'monthly', day: 1, truth: { name: 'Rent', kind: 'housing' } },
      { desc: 'STO J PATEL BILLS', amount: 45, cadence: 'monthly', day: 2 }, // money to a flatmate: never a subscription
      { desc: 'HUTCHISON 3G UK', amount: 12, cadence: 'monthly', day: 18, truth: { name: 'Three', kind: 'bill' } },
      { desc: 'SPOTIFY', amount: 11.99, cadence: 'monthly', day: 5, truth: { name: 'Spotify', kind: 'subscription' } },
      { desc: 'OPENAI *CHATGPT SUBSCR', amount: 20, cadence: 'monthly', day: 13, truth: { name: 'ChatGPT Plus', kind: 'subscription' } },
      { desc: 'ANTHROPIC CLAUDE.AI SUBSCRIPTION', amount: 18, cadence: 'monthly', day: 27, start: '2026-05-01', truth: { name: 'Claude Pro', kind: 'subscription' } },
      { desc: 'PLAYSTATION NETWORK', amount: 10.99, cadence: 'monthly', day: 8, truth: { name: 'PlayStation Plus', kind: 'subscription' } },
      { desc: 'THE GYM GROUP', amount: 22.99, cadence: 'monthly', day: 1, end: '2026-05-31' }, // switched gyms: ended
      { desc: 'PUREGYM LTD', amount: 27.99, cadence: 'monthly', day: 6, start: '2026-06-01', truth: { name: 'PureGym', kind: 'subscription' } },
      { desc: 'UBER ONE MEMBERSHIP', amount: 5.99, cadence: 'monthly', day: 23, truth: { name: 'Uber One', kind: 'subscription' } },
      { desc: 'DELIVEROO PLUS', amount: 3.49, cadence: 'monthly', day: 12, truth: { name: 'Deliveroo Plus', kind: 'subscription' } },
      { desc: 'DUOLINGO', amount: 79.99, cadence: 'yearly', start: '2026-01-15', truth: { name: 'Duolingo', kind: 'subscription' } },
      { desc: 'AUDIBLE UK', amount: 7.99, cadence: 'monthly', day: 10, truth: { name: 'Audible', kind: 'subscription' } },
      { desc: 'STRAVA', amount: 8.99, cadence: 'monthly', day: 5, start: '2026-10-01', truth: { name: 'Strava', kind: 'subscription' } },
      { desc: 'PATREON* MEMBERSHIP', amount: 4, cadence: 'monthly', day: 1, truth: { name: 'Patreon', kind: 'subscription', category: 'creator', ai: true } },
      { desc: 'CRUNCHYROLL', amount: 6.49, cadence: 'monthly', day: 16, truth: { name: 'Crunchyroll', kind: 'subscription', category: 'video', ai: true } },
      { desc: 'KLX*MEMBER SERVICES 0203', amount: 9.5, cadence: 'monthly', day: 24, start: '2026-03-01', truth: { name: 'KLX member services', kind: 'subscription' } },
    ],
    events: [
      { date: '2026-09-28', desc: 'STRAVA', amount: 0, note: 'free trial start' },
    ],
    noise: r => [
      ...everyDays(START, END, 4, r, d => ({ date: d, desc: 'TESCO EXPRESS 3312', amount: money(r, 6, 32), note: 'top-up shop' })),
      ...everyDays(START, END, 1, r, d => r() < 0.45 ? { date: d, desc: 'PRET A MANGER MCR', amount: 3.4, note: 'same coffee, same price' } : null),
      ...everyDays(START, END, 1, r, d => r() < 0.5 ? { date: d, desc: 'BEE NETWORK BUS', amount: 2, note: 'bus fare, same price daily' } : null),
      ...everyDays(START, END, 8, r, d => ({ date: d, desc: 'UBER *TRIP', amount: money(r, 7, 19), note: 'taxi' })),
    ],
    expectFlags: [
      { type: 'duplicate', name: 'Claude Pro' },
      { type: 'duplicate', name: 'Deliveroo Plus' },
      { type: 'trial-converted', name: 'Strava' },
      { type: 'unknown', name: 'KLX member services' },
    ],
    mustNotBeSubscription: ['Groceries', 'Eating out', 'Transport', 'J Patel Bills', 'Bee Network Bus', 'The Gym Group (active)'],
  },
];

function datesFor(s: Stream, r: () => number): string[] {
  const from = s.start ?? START, to = s.end ?? END;
  const out: string[] = [];
  if (s.cadence === 'yearly') { for (let d = from; d <= to; d = addMonths(d, 12)) out.push(d); return out; }
  if (s.cadence === 'weekly') {
    for (let d = from; d <= to; d = addDays(d, 7)) if (!(s.skip && r() < s.skip)) out.push(d);
    return out;
  }
  // monthly on a fixed day, with ±1 day wobble
  let d = `${from.slice(0, 7)}-${String(s.day ?? 1).padStart(2, '0')}`;
  if (d < from) d = addMonths(d, 1);
  for (; d <= to; d = addMonths(d, 1)) out.push(addDays(d, (s.jitter ?? 1) && r() < 0.25 ? 1 : 0));
  return out.filter(x => x <= END);
}

function toCsv(h: Household, rows: Event[]): string {
  const q = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  if (h.format === 'monzo') {
    const head = 'Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency,Local amount,Local currency,Notes and #tags,Address,Receipt,Description,Category split,Money Out,Money In';
    return [head, ...rows.map((e, i) => {
      const amt = (-e.amount).toFixed(2);
      return ['tx_' + h.id + String(i).padStart(5, '0'), dmy(e.date), '09:00:00', e.amount < 0 ? 'Faster payment' : 'Card payment', q(e.desc), '', 'general', amt, 'GBP', amt, 'GBP', '', '', '', q(e.desc), '', e.amount > 0 ? amt : '', e.amount < 0 ? amt : ''].join(',');
    })].join('\n');
  }
  if (h.format === 'nationwide') {
    const pre = '"Account Name:","FlexDirect ****4417"\n"Account Balance:","£2,104.33"\n"Available Balance: ","£2,104.33"\n\n';
    const head = '"Date","Transaction type","Description","Paid out","Paid in","Balance"';
    const d = (iso: string) => new Date(toDay(iso) * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return pre + [head, ...rows.map(e => [d(e.date), e.amount < 0 ? 'Transfer from' : 'Payment to', e.desc, e.amount > 0 ? '£' + e.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 }) : '', e.amount <= 0 && e.amount !== 0 ? '£' + (-e.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 }) : (e.amount === 0 ? '£0.00' : ''), ''].map(x => `"${x}"`).join(','))].join('\n');
  }
  const head = 'Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP),Spending Category,Notes';
  return [head, ...rows.map(e => [dmy(e.date), q(e.desc), q(e.desc), e.amount < 0 ? 'FASTER PAYMENT' : 'CARD', (-e.amount).toFixed(2), '', 'GENERAL', ''].join(','))].join('\n');
}

const outDir = 'src/data/households';
mkdirSync(outDir, { recursive: true });
const index: unknown[] = [];
for (const h of HOUSEHOLDS) {
  const r = rng(h.seed);
  const rows: Event[] = [];
  const truth: unknown[] = [];
  for (const s of h.streams) {
    const ds = datesFor(s, r);
    let current = s.amount;
    for (const d of ds) {
      let amt = s.amount;
      for (const rise of s.rises ?? []) if (d >= rise.from) amt = rise.amount;
      current = amt;
      rows.push({ date: d, desc: s.desc, amount: amt, note: s.truth?.name ?? (s.income ? 'income' : 'not a subscription') });
    }
    if (s.truth) {
      const ended = !!s.end && s.end < END;
      truth.push({ desc: s.desc, ...s.truth, cadence: s.cadence, amount: current, previous: s.rises?.length ? s.amount : undefined, active: !ended });
    }
  }
  for (const e of h.events) rows.push(e);
  rows.push(...h.noise(r));
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  writeFileSync(`${outDir}/${h.id}.csv`, toCsv(h, rows));
  index.push({ id: h.id, name: h.name, firstName: h.firstName, blurb: h.blurb, format: h.format, periodEnd: END, txns: rows.length, truth, expectFlags: h.expectFlags, mustNotBeSubscription: h.mustNotBeSubscription });
  console.log(`${h.id}: ${rows.length} transactions, ${truth.length} labelled streams (${h.format} format)`);
}
writeFileSync('src/data/answer-key.json', JSON.stringify(index, null, 1));
