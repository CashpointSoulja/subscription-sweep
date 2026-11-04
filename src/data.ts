import key from './data/answer-key.json';
import labels from './data/merchant-labels.json';
import { parseBankCsv, sweep, type AiLabels, type SweepResult, type Txn } from './engine';

const csvs = import.meta.glob('./data/households/*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const AI_LABELS = labels as unknown as AiLabels;

export interface Household { id: string; name: string; firstName: string; blurb: string; format: string; periodEnd: string; csv: string }
export const HOUSEHOLDS: Household[] = (key as unknown as Household[]).map(h => ({
  id: h.id, name: h.name, firstName: h.firstName, blurb: h.blurb, format: h.format, periodEnd: h.periodEnd,
  csv: csvs[`./data/households/${h.id}.csv`],
}));

const cache = new Map<string, { result: SweepResult; txns: Txn[]; format: string }>();
export function sweepHousehold(id: string) {
  if (!cache.has(id)) {
    const h = HOUSEHOLDS.find(x => x.id === id)!;
    const parsed = parseBankCsv(h.csv);
    cache.set(id, { result: sweep(parsed.txns, { ai: AI_LABELS, periodEnd: h.periodEnd }), txns: parsed.txns, format: parsed.format });
  }
  return cache.get(id)!;
}

export const owner = (h: { name: string }) => (h.name.startsWith('The ') ? `${h.name.replace(/s$/, '')} family` : h.name);
