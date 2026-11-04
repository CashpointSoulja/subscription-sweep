import { gbp, gbp0 } from './detect';
import type { Flag, SweepResult } from './types';

const SHORT: Record<Flag['type'], (f: Flag) => string> = {
  duplicate: f => f.title.replace(/^Two /, '2 ') + ` (save ${gbp0(f.impact)}/yr)`,
  'price-rise': f => f.title,
  'trial-converted': f => f.title,
  new: f => f.title,
  'renewal-soon': f => f.title + ` (${gbp(f.impact)})`,
  'double-charge': f => f.title + ` (${gbp(f.impact)} back)`,
  stack: f => f.title + ` (pause one, save ${gbp0(f.impact)}/yr)`,
  unknown: f => `A payment I can't name (${gbp0(f.impact)}/yr)`,
};

/**
 * The member-facing message. Deterministic: numbers come from the rules, never from a model.
 * Shows at most 3 actions so it stays readable on a phone.
 */
export function composeMessage(r: SweepResult, firstName: string): { lines: string[]; replies: string[] } {
  const top = r.flags.filter(f => f.impactPeriod !== 'none').slice(0, 3);
  const lines: string[] = [];
  lines.push(`Hi ${firstName} 👋 I've been through your last ${Math.round(r.period.days / 30.4)} months of payments.`);
  lines.push(`You've got ${r.subscriptions.length} subscriptions costing ${gbp0(r.totals.subscriptionsAnnual)} a year.`);
  if (top.length === 0) {
    lines.push('Nothing looks off. Nice. I’ll keep an eye out for price rises.');
    return { lines, replies: [] };
  }
  lines.push(`${top.length === 1 ? 'One is' : `${top.length} are`} worth a look:`);
  top.forEach((f, i) => lines.push(`${i + 1}. ${SHORT[f.type](f)}`));
  const extra = r.flags.length - top.length;
  if (extra > 0) lines.push(`(+${extra} more in your sweep)`);
  if (r.bills.length) lines.push(`I can also check your ${r.bills.slice(0, 2).map(b => b.merchant.name).join(' and ')} bill${r.bills.length > 1 ? 's' : ''} for a better deal.`);
  lines.push('Want me to sort any of these? Reply with a number. Nothing gets cancelled without your yes for that one.');
  return { lines, replies: top.map((_, i) => String(i + 1)).concat('Not now') };
}
