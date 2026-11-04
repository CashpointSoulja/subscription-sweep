import { addDays, addMonths, daysBetween, fmtDate, toDay } from './dates';
import { CATEGORY_LABEL, productHint, resolveMerchant, type AiLabels } from './merchants';
import type { Cadence, Category, Flag, MerchantInfo, Series, SweepResult, Txn } from './types';

interface CadenceRule { c: Cadence; min: number; max: number; tol: number; perYear: number; days: number; maxSkip: number }
const CADENCES: CadenceRule[] = [
  { c: 'weekly', min: 5, max: 9, tol: 2, perYear: 52, days: 7, maxSkip: 3 },
  { c: 'monthly', min: 25, max: 36, tol: 5, perYear: 12, days: 30.44, maxSkip: 2 },
  { c: 'quarterly', min: 80, max: 100, tol: 10, perYear: 4, days: 91.3, maxSkip: 1 },
  { c: 'yearly', min: 340, max: 390, tol: 20, perYear: 1, days: 365.25, maxSkip: 1 },
];
const rule = (c: Cadence) => CADENCES.find(r => r.c === c)!;

/** Categories where two services usually do the same job. Video is a "stack", not a duplicate. */
const DUPLICATE_CATEGORIES: Category[] = ['music', 'cloud', 'ai-assistant', 'food-delivery', 'dating'];
const TRIAL_MAX = 2;          // £0–£2 first charge = trial or intro price
const NEW_WINDOW = 45;        // days
const RENEWAL_WINDOW = 30;    // days
const REFUND_WINDOW = 10;     // days

const r2 = (n: number) => Math.round(n * 100) / 100;
/** "Music" → "music", but "AI assistant" and "TV & film" keep their capitals. */
const lowerFirst = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

interface Charge { date: string; amount: number; raw: string; merchant: MerchantInfo }

export interface SweepOptions { ai?: AiLabels; periodEnd?: string }

export function sweep(txns: Txn[], opts: SweepOptions = {}): SweepResult {
  const dates = txns.map(t => t.date).sort();
  const start = dates[0] ?? opts.periodEnd ?? '1970-01-01';
  const end = opts.periodEnd ?? dates[dates.length - 1] ?? start;

  // 1. Money out only, with reversed payments (refunds of the same amount within 10 days) taken out.
  const debits: Charge[] = [];
  const credits: Charge[] = [];
  for (const t of txns) {
    const merchant = resolveMerchant(t.description, opts.ai);
    const c = { date: t.date, amount: r2(Math.abs(t.amount)), raw: t.description, merchant };
    (t.amount <= 0 ? debits : credits).push(c);
  }
  for (const cr of credits) {
    const i = debits.findIndex(d => d.merchant.key === cr.merchant.key && d.amount === cr.amount &&
      daysBetween(d.date, cr.date) >= 0 && daysBetween(d.date, cr.date) <= REFUND_WINDOW);
    if (i >= 0) debits.splice(i, 1);
  }

  // 2. Group by merchant. Spending, income and person-to-person transfers are never subscriptions.
  const groups = new Map<string, Charge[]>();
  for (const d of debits) {
    if (['spending', 'income', 'transfer'].includes(d.merchant.kind)) continue;
    const g = groups.get(d.merchant.key) ?? [];
    g.push(d);
    groups.set(d.merchant.key, g);
  }

  const series: Series[] = [];
  for (const [key, charges] of groups) {
    charges.sort((a, b) => toDay(a.date) - toDay(b.date));
    for (const s of buildSeries(key, charges, end)) series.push(s);
  }

  const active = series.filter(s => s.status === 'active');
  const subscriptions = active.filter(s => s.merchant.kind === 'subscription' || s.merchant.kind === 'unknown');
  const bills = active.filter(s => s.merchant.kind === 'bill');
  const fixed = active.filter(s => s.merchant.kind === 'housing');
  const ended = series.filter(s => s.status === 'ended' && s.merchant.kind !== 'housing');

  const flags = buildFlags(subscriptions, bills, end);

  // 3. Totals. A series counts once, at its biggest flag, so stacked flags never double-count.
  const contrib = new Map<string, number>();
  let toClaimBack = 0;
  for (const f of flags) {
    if (f.impactPeriod === 'once') { toClaimBack += f.impact; continue; }
    if (f.impactPeriod !== 'year') continue;
    const k = f.savingSeriesId ?? f.id;
    contrib.set(k, Math.max(contrib.get(k) ?? 0, f.impact));
  }
  const sum = (xs: Series[]) => r2(xs.reduce((a, s) => a + s.annualCost, 0));

  return {
    period: { start, end, days: daysBetween(start, end) + 1 },
    txnCount: txns.length,
    series,
    subscriptions: subscriptions.sort((a, b) => b.annualCost - a.annualCost),
    bills: bills.sort((a, b) => b.annualCost - a.annualCost),
    fixed: fixed.sort((a, b) => b.annualCost - a.annualCost),
    ended,
    flags: flags.sort((a, b) => b.severity - a.severity || b.impact - a.impact),
    totals: {
      subscriptionsAnnual: sum(subscriptions),
      billsAnnual: sum(bills),
      worthALookAnnual: r2([...contrib.values()].reduce((a, b) => a + b, 0)),
      toClaimBack: r2(toClaimBack),
    },
    unlabelled: [...new Set(subscriptions.filter(s => s.merchant.source === 'unknown').map(s => s.charges[0].description))],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildSeries(key: string, charges: Charge[], end: string): Series[] {
  const m = charges[0].merchant;
  const out: Series[] = [];

  // Trial markers: £0–£2 charges at a known subscription merchant when the normal price is higher.
  const typical = median(charges.map(c => c.amount));
  const isTrialish = (c: Charge) => m.kind === 'subscription' && m.source !== 'unknown' && c.amount <= TRIAL_MAX && typical > TRIAL_MAX * 2;
  const trials = charges.filter(isTrialish);
  const paid = charges.filter(c => !isTrialish(c));
  if (paid.length === 0) return out;

  // Split by price so two plans at one merchant (two EE lines, Apple's many products) stay apart,
  // then stitch price levels that follow each other (a price rise). Bills wobble more, so looser tolerances.
  const isBill = m.kind === 'bill' || m.kind === 'housing';
  const tol = m.multiProduct ? 0.01 : isBill ? 0.15 : 0.08;
  // Over 25% is a plan change (solo → family), not a price rise. Bills can jump more (end of contract).
  const jump = m.multiProduct ? 0.25 : isBill ? 0.6 : 0.25;
  // Apple/Google: only stitch levels a month apart (different products otherwise). Others: up to a year (quarterly, annual renewals).
  const maxGap = m.multiProduct ? 40 : 400;
  let clusters: Charge[][] = stitch(clusterByAmount(paid, tol), jump, maxGap);
  // A bill with one charge most months is one line whose price moves (seasonal energy), not several lines.
  if (isBill) {
    const perMonth = new Map<string, number>();
    for (const c of paid) perMonth.set(c.date.slice(0, 7), (perMonth.get(c.date.slice(0, 7)) ?? 0) + 1);
    const doubled = [...perMonth.values()].filter(n => n >= 2).length;
    if (doubled < perMonth.size * 0.5) clusters = [paid];
  }

  clusters.forEach((cl, idx) => {
    let s = evaluate(`${key}#${idx}`, m, cl, trials, end);
    // Switched from monthly to annual: one big charge at a subscription merchant that was billing monthly before.
    if (!s && cl.length === 1 && m.kind === 'subscription' && m.source !== 'unknown' && !m.multiProduct) {
      const wasMonthly = clusters.some(o => o !== cl && o.length >= 2 && median(o.map(c => c.amount)) * 6 <= cl[0].amount);
      if (wasMonthly) s = evaluate(`${key}#${idx}`, { ...m, yearly: [cl[0].amount, cl[0].amount] }, cl, trials, end);
    }
    if (s) out.push(s);
  });
  return out;
}

function clusterByAmount(charges: Charge[], tol: number): Charge[][] {
  const sorted = [...charges].sort((a, b) => a.amount - b.amount);
  const clusters: Charge[][] = [];
  for (const c of sorted) {
    const last = clusters[clusters.length - 1];
    const mean = last ? last.reduce((a, x) => a + x.amount, 0) / last.length : 0;
    if (last && Math.abs(c.amount - mean) / mean <= tol) last.push(c);
    else clusters.push([c]);
  }
  return clusters.map(cl => cl.sort((a, b) => toDay(a.date) - toDay(b.date)));
}

/** Joins price levels that follow each other in time (a price rise), but keeps overlapping ones apart (two plans). */
function stitch(clusters: Charge[][], maxJump: number, maxGap = 40): Charge[][] {
  const byStart = [...clusters].sort((a, b) => toDay(a[0].date) - toDay(b[0].date));
  const out: Charge[][] = [];
  for (const cl of byStart) {
    const prev = out.find(p => {
      const pLast = p[p.length - 1], cFirst = cl[0];
      const gap = daysBetween(pLast.date, cFirst.date);
      const jump = Math.abs(cFirst.amount / pLast.amount - 1);
      return gap > 0 && gap <= maxGap && jump <= maxJump && toDay(cl[0].date) > toDay(pLast.date);
    });
    if (prev) prev.push(...cl);
    else out.push([...cl]);
  }
  return out;
}

function evaluate(id: string, merchant: MerchantInfo, cl: Charge[], trials: Charge[], end: string): Series | null {
  const known = merchant.source !== 'unknown';
  let cadence: CadenceRule | undefined;
  let regularity = 0;
  const extra: Charge[] = [];
  let main = cl;

  if (cl.length >= 2) {
    const gaps0 = cl.slice(1).map((c, i) => daysBetween(cl[i].date, c.date));
    const m0 = median(gaps0.filter(g => g > 3)) || median(gaps0);
    cadence = CADENCES.find(r => m0 >= r.min && m0 <= r.max);
    if (cadence) {
      // A second charge inside one cycle = charged twice. Keep it aside instead of breaking the rhythm.
      main = [cl[0]];
      for (const c of cl.slice(1)) {
        if (daysBetween(main[main.length - 1].date, c.date) < cadence.days * 0.4) extra.push(c);
        else main.push(c);
      }
      const gaps = main.slice(1).map((c, i) => daysBetween(main[i].date, c.date));
      const ok = gaps.filter(g => {
        for (let k = 1; k <= cadence!.maxSkip; k++) if (Math.abs(g - k * cadence!.days) <= cadence!.tol * k) return true;
        return false;
      });
      regularity = gaps.length ? ok.length / gaps.length : 0;
      const minCount = cadence.c === 'weekly' ? 4 : cadence.c === 'yearly' ? 2 : known ? 2 : 3;
      if (main.length < minCount || regularity < 0.75) cadence = undefined;
    }
  }

  // One charge only: count it if it's an annual price at a merchant known for annual plans, or a trial just converted.
  let trialStart: string | undefined;
  const trialBefore = trials.find(t => { const g = daysBetween(t.date, cl[0].date); return g >= 3 && g <= 35; });
  if (trialBefore) trialStart = trialBefore.date;
  if (!cadence && cl.length === 1) {
    const c = cl[0];
    if (merchant.yearly && c.amount >= merchant.yearly[0] && c.amount <= merchant.yearly[1]) { cadence = rule('yearly'); regularity = 0.8; }
    else if (trialStart) { cadence = rule('monthly'); regularity = 0.8; }
  }
  if (!cadence) return null;

  const last = main[main.length - 1];
  const current = last.amount;
  // Price change: the most recent level change. Bills wobble, so they need the new level to hold for 2+ charges.
  let previousAmount: number | undefined, priceChangeDate: string | undefined;
  const needHold = merchant.kind === 'bill' && cadence.c !== 'yearly' ? 2 : 1;
  const changes = main.slice(1).filter((c, i) => Math.abs(c.amount - main[i].amount) / main[i].amount > 0.01).length;
  // A bill that changes price over and over (seasonal energy) is variable, not rising. Say nothing.
  const variable = merchant.kind === 'bill' && changes > 2;
  for (let i = main.length - 1; i > 0 && !variable; i--) {
    if (Math.abs(main[i].amount - main[i - 1].amount) / main[i - 1].amount > 0.01) {
      // A smaller first payment is a part-month (pro-rata) start, not a price rise.
      if (i === 1 && main[0].amount < main[1].amount) break;
      const held = main.length - i;
      if (held >= needHold) { previousAmount = main[i - 1].amount; priceChangeDate = main[i].date; }
      break;
    }
  }

  const nextDue = cadence.c === 'monthly' ? addMonths(last.date, 1)
    : cadence.c === 'quarterly' ? addMonths(last.date, 3)
    : cadence.c === 'yearly' ? addMonths(last.date, 12)
    : addDays(last.date, 7);
  const graceDays = cadence.c === 'yearly' ? 395 : cadence.days * 1.6;
  const status = daysBetween(last.date, end) <= graceDays ? 'active' : 'ended';

  // Multi-product billers: price is the only hint to what it is.
  const hint = productHint(merchant, current);
  const m: MerchantInfo = hint ? { ...merchant, category: hint.category } : merchant;
  const labelTrust = merchant.source === 'dictionary' ? 1 : merchant.source === 'ai' ? 0.9 : 0.75;

  return {
    id,
    merchant: m,
    productHint: hint?.hint,
    cadence: cadence.c,
    charges: main.map(c => ({ date: c.date, description: c.raw, amount: -c.amount })),
    firstDate: main[0].date,
    lastDate: last.date,
    currentAmount: current,
    previousAmount,
    priceChangeDate,
    monthlyCost: r2(current * cadence.perYear / 12),
    annualCost: r2(current * cadence.perYear),
    nextDue,
    status,
    confidence: r2(Math.min(1, regularity) * labelTrust * (main.length >= 3 ? 1 : 0.85)),
    trialStart,
    extraCharges: extra.map(c => ({ date: c.date, description: c.raw, amount: -c.amount })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const label = (s: Series) => s.productHint ? `${s.merchant.name} (${s.productHint})` : s.merchant.name;
const per = (s: Series) => s.cadence === 'monthly' ? 'a month' : s.cadence === 'yearly' ? 'a year' : s.cadence === 'weekly' ? 'a week' : 'a quarter';
const perYear = (s: Series) => rule(s.cadence).perYear;

function buildFlags(subs: Series[], bills: Series[], end: string): Flag[] {
  const flags: Flag[] = [];
  let n = 0;
  const add = (f: Omit<Flag, 'id'>) => flags.push({ id: `f${++n}`, ...f });

  // Duplicates: same job, different services. Or two plans at the same merchant.
  const byCat = new Map<Category, Series[]>();
  for (const s of subs) if (DUPLICATE_CATEGORIES.includes(s.merchant.category)) byCat.set(s.merchant.category, [...(byCat.get(s.merchant.category) ?? []), s]);
  for (const [cat, list] of byCat) {
    const names = new Set(list.map(s => s.merchant.name + (s.productHint ?? '')));
    if (list.length < 2 || names.size < 2) continue;
    const sorted = [...list].sort((a, b) => b.annualCost - a.annualCost);
    const cheaper = sorted.slice(1);
    for (const c of cheaper) {
      add({
        type: 'duplicate', seriesIds: sorted.map(s => s.id), savingSeriesId: c.id,
        title: `Two ${lowerFirst(CATEGORY_LABEL[cat])} subscriptions`,
        detail: `${label(sorted[0])} (${gbp(sorted[0].currentAmount)} ${per(sorted[0])}) and ${label(c)} (${gbp(c.currentAmount)} ${per(c)}) do the same job. Keeping one saves ${gbp0(c.annualCost)} a year.`,
        impact: c.annualCost, impactPeriod: 'year', basis: 'cost of the cheaper one', severity: 2,
      });
    }
  }
  const byMerchant = new Map<string, Series[]>();
  for (const s of subs) if (!s.merchant.multiProduct) byMerchant.set(s.merchant.key, [...(byMerchant.get(s.merchant.key) ?? []), s]);
  for (const list of byMerchant.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => b.annualCost - a.annualCost);
    for (const c of sorted.slice(1)) {
      add({
        type: 'duplicate', seriesIds: sorted.map(s => s.id), savingSeriesId: c.id,
        title: `Two ${c.merchant.name} plans`,
        detail: `You're paying ${c.merchant.name} twice: ${gbp(sorted[0].currentAmount)} and ${gbp(c.currentAmount)} ${per(c)}. Probably two accounts. Merging them saves up to ${gbp0(c.annualCost)} a year.`,
        impact: c.annualCost, impactPeriod: 'year', basis: 'cost of the cheaper plan', severity: 3,
      });
    }
  }

  // Streaming stack: 3+ TV & film services. Rotating saves money; it's a nudge, not an error.
  const video = subs.filter(s => s.merchant.category === 'video');
  const videoNames = [...new Set(video.map(s => s.merchant.name))];
  if (videoNames.length >= 3) {
    const cheapest = [...video].sort((a, b) => a.annualCost - b.annualCost)[0];
    const total = video.reduce((a, s) => a + s.annualCost, 0);
    add({
      type: 'stack', seriesIds: video.map(s => s.id), savingSeriesId: cheapest.id,
      title: `${videoNames.length} streaming services`,
      detail: `${videoNames.join(', ')}: ${gbp0(total)} a year together. Most people rotate. Pausing ${cheapest.merchant.name} alone saves ${gbp0(cheapest.annualCost)}.`,
      impact: cheapest.annualCost, impactPeriod: 'year', basis: 'if you drop the cheapest', severity: 1,
    });
  }

  for (const s of [...subs, ...bills]) {
    const isBill = s.merchant.kind === 'bill';
    // Price rises.
    if (s.previousAmount && s.currentAmount > s.previousAmount * 1.03 && s.priceChangeDate) {
      const diff = r2(s.currentAmount - s.previousAmount);
      add({
        type: 'price-rise', seriesIds: [s.id], savingSeriesId: s.id,
        title: `${s.merchant.name} went up ${gbp(diff)} ${per(s)}`,
        detail: `From ${gbp(s.previousAmount)} to ${gbp(s.currentAmount)} on ${fmtDate(s.priceChangeDate, { day: 'numeric', month: 'short', year: 'numeric' })}. That's ${gbp0(diff * perYear(s))} more a year.` +
          (isBill ? ' Nous can check for a better deal.' : ''),
        impact: r2(diff * perYear(s)), impactPeriod: 'year', basis: 'the increase only', severity: 2,
      });
    }
    // Annual plan renewing soon: the moment to decide. For a bill, the moment Nous can switch it.
    if (s.cadence === 'yearly') {
      const until = daysBetween(end, s.nextDue);
      if (until > 0 && until <= RENEWAL_WINDOW) {
        add({
          type: 'renewal-soon', seriesIds: [s.id], savingSeriesId: s.id,
          title: `${s.merchant.name} renews on ${fmtDate(s.nextDue)}`,
          detail: `${gbp(s.currentAmount)} for another year, ${until} days after this statement ends. ` + (isBill ? 'Nous can check for a better deal before it renews.' : 'Decide before it charges.'),
          impact: isBill ? 0 : s.annualCost, impactPeriod: isBill ? 'none' : 'year', basis: isBill ? 'a switch saves money; the amount depends on the quote' : 'full yearly cost', severity: isBill ? 2 : 3,
        });
      }
    }
    if (isBill) continue;

    // Trial turned into a paid plan.
    if (s.trialStart && daysBetween(s.firstDate, end) <= 90) {
      add({
        type: 'trial-converted', seriesIds: [s.id], savingSeriesId: s.id,
        title: `${s.merchant.name} trial is now ${gbp(s.currentAmount)} ${per(s)}`,
        detail: `Free or cheap from ${fmtDate(s.trialStart)}, full price since ${fmtDate(s.firstDate)}. If you didn't mean to keep it, that's ${gbp0(s.annualCost)} a year.`,
        impact: s.annualCost, impactPeriod: 'year', basis: 'full yearly cost', severity: 3,
      });
    } else if (daysBetween(s.firstDate, end) <= NEW_WINDOW && s.charges.length <= 2 && s.cadence !== 'yearly') {
      add({
        type: 'new', seriesIds: [s.id], savingSeriesId: s.id,
        title: `New: ${label(s)}`,
        detail: `Started ${fmtDate(s.firstDate)} at ${gbp(s.currentAmount)} ${per(s)}. Worth a quick check that you meant to keep it.`,
        impact: s.annualCost, impactPeriod: 'year', basis: 'full yearly cost', severity: 1,
      });
    }


    // Charged twice in one cycle.
    if (s.extraCharges.length) {
      const amt = r2(s.extraCharges.reduce((a, c) => a + Math.abs(c.amount), 0));
      add({
        type: 'double-charge', seriesIds: [s.id],
        title: `${s.merchant.name} charged you twice`,
        detail: `Extra charge${s.extraCharges.length > 1 ? 's' : ''} on ${s.extraCharges.map(c => fmtDate(c.date)).join(', ')} with no refund. Worth asking for ${gbp(amt)} back.`,
        impact: amt, impactPeriod: 'once', basis: 'money to claim back', severity: 3,
      });
    }

    // Repeat payment we couldn't name: the classic forgotten subscription.
    if (s.merchant.source === 'unknown') {
      add({
        type: 'unknown', seriesIds: [s.id], savingSeriesId: s.id,
        title: `Can't name this one`,
        detail: `"${s.charges[0].description}" takes ${gbp(s.currentAmount)} ${per(s)} since ${fmtDate(s.firstDate)}. If you don't recognise it, check it.`,
        impact: s.annualCost, impactPeriod: 'year', basis: "full yearly cost, if you don't recognise it", severity: 2,
      });
    }
  }
  return flags;
}

export { gbp, gbp0 };
