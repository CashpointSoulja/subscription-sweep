/**
 * The AI layer. Finds repeat payments the dictionary can't name and asks Claude what they are.
 * Claude sees ONLY the bank descriptor text: no amounts, dates or anything personal.
 * It returns a name + category + confidence. Below 0.6 confidence we keep "unknown".
 * Results are cached in src/data/merchant-labels.json, so the app never calls a model at runtime.
 *
 * Run: npm run label            (sample + holdout households)
 *      npm run label -- my.csv  (also label a real export; the CSV stays on this machine)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { keyOf, parseBankCsv, resolveMerchant, sweep, type AiLabels } from '../src/engine';

const CATEGORIES = ['video', 'music', 'cloud', 'gaming', 'fitness', 'news', 'software', 'ai-assistant', 'books', 'food-box', 'food-delivery', 'dating', 'wellbeing', 'education', 'shopping', 'creator', 'charity', 'other',
  'energy', 'broadband', 'mobile', 'insurance', 'tv-package', 'tv-licence', 'council-tax', 'water', 'rent', 'mortgage', 'vehicle-tax',
  'groceries', 'eating-out', 'transport', 'retail', 'person', 'finance', 'salary'];

const SYSTEM = `You label UK bank-statement merchant descriptors for a subscription tracker.
For each descriptor, say which consumer brand it is and what category it belongs to.
Rules:
- Only name a brand you genuinely recognise from the descriptor text. If unsure, use name "Unknown" and confidence below 0.5.
- category must be one of: ${CATEGORIES.join(', ')}. Use "charity" for charities, "creator" for creator memberships, "shopping" only for paid shopping memberships (like Amazon Prime), "retail" for ordinary shops.
- confidence is 0 to 1: how sure you are of the brand.
- annual is true only if this merchant is usually paid as a yearly plan or membership (e.g. a heritage membership, antivirus, breakdown cover).
- Use mortgage/rent/council-tax/water/tv-licence/vehicle-tax for housing and fixed costs, person for payments to individuals, insurance for breakdown cover, finance for loans, credit cards, buy-now-pay-later, cash withdrawals and bank fees.
- Never mention prices or dates.
Reply with only a JSON array: [{"key": "<key as given>", "name": "<brand>", "category": "<category>", "confidence": <0-1>, "annual": <true|false>}]`;

const FILE = 'src/data/merchant-labels.json';
const existing: AiLabels & Record<string, unknown> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};

// Collect unknown repeat-payment descriptors.
const csvs = [
  ...readdirSync('src/data/households').map(f => `src/data/households/${f}`),
  ...['holdout', 'holdout2'].flatMap(d => (existsSync(`src/data/${d}`) ? readdirSync(`src/data/${d}`).filter(f => f.endsWith('.csv')).map(f => `src/data/${d}/${f}`) : [])),
  ...process.argv.slice(2).filter(a => a.endsWith('.csv')),
];
const refresh = process.argv.includes('--refresh');
const todo = new Map<string, string>(); // key -> example descriptor
for (const path of csvs) {
  const { txns } = parseBankCsv(readFileSync(path, 'utf8'));
  const res = sweep(txns, { ai: existing });
  for (const d of res.unlabelled) { const k = keyOf(d); if (refresh || !existing[k]) todo.set(k, d); }
  // Candidates the rules haven't confirmed yet: unknown merchants seen twice, or once at £15+ (could be an annual plan).
  const seen = new Map<string, { n: number; max: number; d: string }>();
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const m = resolveMerchant(t.description);
    if (m.source !== 'unknown') continue;
    const e = seen.get(m.key) ?? { n: 0, max: 0, d: t.description };
    e.n++; e.max = Math.max(e.max, -t.amount); seen.set(m.key, e);
  }
  for (const [k, e] of seen) if ((e.n >= 2 || e.max >= 15) && (refresh || !existing[k])) todo.set(k, e.d);
}
console.log(`${csvs.length} files scanned, ${todo.size} new descriptor(s) to label.`);
if (todo.size === 0) process.exit(0);

const items = [...todo].map(([key, example]) => ({ key, descriptor: example }));
const prompt = `Label these descriptors:\n${JSON.stringify(items, null, 1)}`;
const raw = execFileSync('claude', ['-p', '--model', 'haiku', '--output-format', 'json', '--strict-mcp-config', '--system-prompt', SYSTEM], { input: prompt, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 180_000 });
const text: string = JSON.parse(raw).result ?? '';
const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
const labels: { key: string; name: string; category: string; confidence: number; annual?: boolean }[] = JSON.parse(json);

const now = new Date().toISOString();
for (const l of labels) {
  if (!todo.has(l.key)) continue;                                  // ignore anything we didn't ask about
  const category = CATEGORIES.includes(l.category) ? l.category : 'other';
  // Stability rule: a refresh never replaces a confident label with an unsure one. Labels shouldn't flip-flop between runs.
  const prev = existing[l.key] as { confidence?: number; name?: string } | undefined;
  if (prev && (prev.confidence ?? 0) >= 0.6 && (Number(l.confidence) || 0) < 0.6) { console.log(`  ${l.key.padEnd(28)} kept "${prev.name}" (new answer was unsure)`); continue; }
  existing[l.key] = { name: l.name, category: category as never, confidence: Math.max(0, Math.min(1, Number(l.confidence) || 0)), annual: l.annual === true, descriptor: todo.get(l.key), model: 'claude haiku via Claude Code', labelledAt: now } as never;
  console.log(`  ${l.key.padEnd(28)} → ${l.name} · ${category} · ${l.confidence}${l.annual ? ' · annual' : ''}`);
}
writeFileSync(FILE, JSON.stringify(existing, null, 1));
console.log(`Saved ${FILE}`);
