/**
 * Scores the engine against the answer key. Run: npm run eval  (add --rules-only to switch the AI labels off)
 * Writes src/data/eval-results.json, which the Accuracy page reads.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseBankCsv, resolveMerchant, sweep, type AiLabels, type Series, type SweepResult } from '../src/engine';

interface Truth { desc: string; name: string; kind: string; category?: string; ai?: boolean; cadence: string; amount: number; previous?: number; active: boolean }
interface KeyEntry { id: string; name: string; periodEnd: string; truth: Truth[]; expectFlags: { type: string; name: string; amount?: number }[]; mustNotBeSubscription: string[] }

const rulesOnly = process.argv.includes('--rules-only');
const quiet = process.argv.includes('--quiet');
const set = process.argv.includes('--holdout2') ? 'holdout2' : process.argv.includes('--holdout') ? 'holdout' : '';
const holdout = !!set;
const KEY = set ? `src/data/${set}/${set}-key.json` : 'src/data/answer-key.json';
const CSV = (id: string) => set ? `src/data/${set}/${id}.csv` : `src/data/households/${id}.csv`;
const key: KeyEntry[] = JSON.parse(readFileSync(KEY, 'utf8'));
const ai: AiLabels = !rulesOnly && existsSync('src/data/merchant-labels.json') ? JSON.parse(readFileSync('src/data/merchant-labels.json', 'utf8')) : {};

type Score = { tp: number; fp: number; fn: number };
const z = (): Score => ({ tp: 0, fp: 0, fn: 0 });
const add = (a: Score, b: Score) => { a.tp += b.tp; a.fp += b.fp; a.fn += b.fn; };
const p = (s: Score) => (s.tp + s.fp ? s.tp / (s.tp + s.fp) : 1);
const r = (s: Score) => (s.tp + s.fn ? s.tp / (s.tp + s.fn) : 1);

export function scoreHousehold(h: KeyEntry, res: SweepResult) {
  const used = new Set<string>();
  const matchOf = new Map<Truth, Series>();
  for (const t of h.truth) {
    const k = resolveMerchant(t.desc).key;
    const cands = res.series.filter(s => s.merchant.key === k && !used.has(s.id)).sort((a, b) => Math.abs(a.currentAmount - t.amount) - Math.abs(b.currentAmount - t.amount));
    if (cands[0]) { used.add(cands[0].id); matchOf.set(t, cands[0]); }
  }
  const truthBySeries = new Map([...matchOf].map(([t, s]) => [s.id, t]));

  const detection = (kinds: string[], detected: Series[]) => {
    const s = z(); const missed: string[] = []; const extra: string[] = [];
    for (const t of h.truth.filter(t => kinds.includes(t.kind) && t.active)) {
      const m = matchOf.get(t);
      if (m && detected.includes(m)) s.tp++; else { s.fn++; missed.push(`${t.name} £${t.amount}`); }
    }
    for (const d of detected) {
      const t = truthBySeries.get(d.id);
      if (!t || !kinds.includes(t.kind) || !t.active) { s.fp++; extra.push(`${d.merchant.name} £${d.currentAmount}`); }
    }
    return { ...s, missed, extra };
  };
  const subs = detection(['subscription'], res.subscriptions);
  const bills = detection(['bill', 'housing'], [...res.bills, ...res.fixed]);

  // Price + cadence exactness on matched active streams.
  let exact = 0, matched = 0;
  for (const [t, s] of matchOf) if (t.active && s.status === 'active') { matched++; if (s.currentAmount === t.amount && s.cadence === t.cadence) exact++; }

  // AI labelling: streams the dictionary doesn't know.
  const aiTruth = h.truth.filter(t => t.ai);
  const aiOk = aiTruth.filter(t => { const s = matchOf.get(t); return s && s.merchant.source === 'ai' && s.merchant.category === t.category; }).length;

  // Flags.
  const flags = z(); const missedFlags: string[] = []; const extraFlags: string[] = [];
  const usedFlags = new Set<string>();
  const nameOf = (id: string) => res.series.find(s => s.id === id);
  for (const e of h.expectFlags) {
    // A flag matches if it's the same type and is about the expected payment. Names are compared by the engine's name OR
    // the answer key's name for that payment ("LV=" vs "Liverpool Victoria"). An expected amount must match the payment
    // the flag is about (for duplicates: the one that counts as the saving).
    const f = res.flags.find(f => !usedFlags.has(f.id) && f.type === e.type && (() => {
      const ids = f.type === 'duplicate' && f.savingSeriesId ? [f.savingSeriesId] : f.type === 'stack' ? f.seriesIds : [f.savingSeriesId ?? f.seriesIds[0]];
      return ids.some(id => {
        const s = nameOf(id);
        const nameOk = s?.merchant.name === e.name || truthBySeries.get(id)?.name === e.name;
        const amountOk = e.amount == null || f.type === 'stack' || s?.currentAmount === e.amount;
        return nameOk && amountOk;
      });
    })());
    if (f) { usedFlags.add(f.id); flags.tp++; } else { flags.fn++; missedFlags.push(`${e.type}: ${e.name}`); }
  }
  for (const f of res.flags) if (!usedFlags.has(f.id)) { flags.fp++; extraFlags.push(`${f.type}: ${f.title}`); }

  return { subs, bills, exact, matched, ai: { ok: aiOk, total: aiTruth.length }, flags: { ...flags, missed: missedFlags, extra: extraFlags } };
}

const out = { runAt: new Date().toISOString(), mode: rulesOnly ? 'rules-only' : 'rules+ai', households: [] as unknown[], overall: {} as Record<string, unknown> };
const S = z(), B = z(), F = z(); let exact = 0, matched = 0, aiOk = 0, aiTotal = 0, txns = 0, streams = 0;
for (const h of key) {
  const csv = readFileSync(CSV(h.id), 'utf8');
  const parsed = parseBankCsv(csv);
  const res = sweep(parsed.txns, { ai, periodEnd: h.periodEnd });
  const sc = scoreHousehold(h, res);
  add(S, sc.subs); add(B, sc.bills); add(F, sc.flags);
  exact += sc.exact; matched += sc.matched; aiOk += sc.ai.ok; aiTotal += sc.ai.total; txns += parsed.txns.length; streams += h.truth.length;
  out.households.push({ id: h.id, name: h.name, format: parsed.format, txns: parsed.txns.length, skipped: parsed.skipped, ...sc, worthALook: res.totals.worthALookAnnual, toClaimBack: res.totals.toClaimBack, subscriptionsAnnual: res.totals.subscriptionsAnnual });
  if (!quiet) {
    console.log(`\n${h.name} (${parsed.format}, ${parsed.txns.length} txns, skipped ${parsed.skipped})`);
    console.log(`  subscriptions  tp ${sc.subs.tp} fp ${sc.subs.fp} fn ${sc.subs.fn}${sc.subs.missed.length ? '  missed: ' + sc.subs.missed.join(', ') : ''}${sc.subs.extra.length ? '  extra: ' + sc.subs.extra.join(', ') : ''}`);
    console.log(`  bills+fixed    tp ${sc.bills.tp} fp ${sc.bills.fp} fn ${sc.bills.fn}${sc.bills.missed.length ? '  missed: ' + sc.bills.missed.join(', ') : ''}${sc.bills.extra.length ? '  extra: ' + sc.bills.extra.join(', ') : ''}`);
    console.log(`  flags          tp ${sc.flags.tp} fp ${sc.flags.fp} fn ${sc.flags.fn}${sc.flags.missed.length ? '  missed: ' + sc.flags.missed.join(' | ') : ''}${sc.flags.extra.length ? '  extra: ' + sc.flags.extra.join(' | ') : ''}`);
    console.log(`  exact price+cadence ${sc.exact}/${sc.matched} · AI labels ${sc.ai.ok}/${sc.ai.total} · worth a look £${res.totals.worthALookAnnual} · claim back £${res.totals.toClaimBack}`);
  }
}
const pct = (x: number) => Math.round(x * 1000) / 10;
out.overall = {
  txns, streams,
  subscriptions: { ...S, precision: pct(p(S)), recall: pct(r(S)) },
  bills: { ...B, precision: pct(p(B)), recall: pct(r(B)) },
  flags: { ...F, precision: pct(p(F)), recall: pct(r(F)) },
  exactPrice: { ok: exact, total: matched },
  aiLabels: { ok: aiOk, total: aiTotal },
};
console.log(`\nOVERALL (${out.mode}) subs P ${pct(p(S))}% R ${pct(r(S))}% · bills P ${pct(p(B))}% R ${pct(r(B))}% · flags P ${pct(p(F))}% R ${pct(r(F))}% · exact £ ${exact}/${matched} · AI ${aiOk}/${aiTotal}`);
const outFile = process.argv.find(a => a.startsWith('--out='))?.slice(6) ?? (holdout ? `src/data/eval-results-${set}.json` : rulesOnly ? 'src/data/eval-results-rules-only.json' : 'src/data/eval-results.json');
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log('wrote', outFile);
