import { useEffect, useState } from 'react';
import { addDays, addMonths } from '../engine/dates';
import { prefersReducedMotion } from '../motion';
import { gbp0, type Series, type SweepResult } from '../engine';

const PER_YEAR = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 } as const;
const CYCLE_DAYS = { weekly: 7, monthly: 31, quarterly: 92, yearly: 366 } as const;

/** What the subscriptions a member is signed up to cost per month, month by month. Annual plans are spread over 12 months,
 *  so a yearly charge doesn't look like a spike and the creep (new sign-ups, price rises) is what shows. */
export function monthlyRunRate(result: SweepResult): { month: string; total: number }[] {
  const months: string[] = [];
  for (let m = result.period.start.slice(0, 7) + '-01'; m <= result.period.end; m = addMonths(m, 1)) months.push(m.slice(0, 7));
  const subs = result.series.filter(s => s.merchant.kind === 'subscription' || s.merchant.kind === 'unknown');
  const runRate = (s: Series, m: string) => {
    const start = m + '-01', end = addDays(addMonths(start, 1), -1);
    const paidUntil = s.status === 'active' ? '9999-12-31' : addDays(s.lastDate, CYCLE_DAYS[s.cadence] - 1);
    if (s.firstDate > end || paidUntil < start) return 0;
    const upTo = s.charges.filter(c => c.date <= end);
    const price = Math.abs((upTo[upTo.length - 1] ?? s.charges[0]).amount);
    return price * PER_YEAR[s.cadence] / 12;
  };
  return months.map(month => ({ month, total: subs.reduce((a, s) => a + runRate(s, month), 0) }));
}

export function SpendChart({ result }: { result: SweepResult }) {
  const data = monthlyRunRate(result);
  const [hover, setHover] = useState<number | null>(null);
  // Bars start flat and grow on the first paint; after that they glide between households.
  const [grown, setGrown] = useState(prefersReducedMotion());
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true))); return () => cancelAnimationFrame(id); }, []);
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.total)) * 1.12 || 1;
  const first = data[0].total, last = data[data.length - 1].total, diff = last - first;
  const label = (m: string, year = false) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  const many = data.length > 18;
  return (
    <section className="chart-card">
      <div className="chart-head">
        <div>
          <h2>What your subscriptions cost per month</h2>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Everything you're signed up to that month. Yearly plans spread over 12 months</div>
        </div>
        <span className="delta tnum">{gbp0(first)} in {label(data[0].month)} → {gbp0(last)} in {label(data[data.length - 1].month)}{Math.abs(diff) >= 1 && <> · {diff > 0 ? 'up' : 'down'} {gbp0(Math.abs(diff))} a month</>}</span>
      </div>
      <div className="bars" role="img" aria-label={`Monthly subscription cost, ${gbp0(first)} in ${label(data[0].month, true)} to ${gbp0(last)} in ${label(data[data.length - 1].month, true)}`} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1, h = grown ? (d.total / max) * 100 : 0;
          const showVal = hover === i || (hover === null && (isLast || i === 0));
          return (
            <div key={i} className={`bar-col${isLast ? ' last' : ''}${hover === i ? ' hot' : ''}`} style={{ ['--i' as string]: i }}
              onMouseEnter={() => setHover(i)} onClick={() => setHover(h => (h === i ? null : i))}>
              {/* The bar is a full-height shape slid down out of view, so growing is a transform, never a layout change. */}
              <div className="bar-track">
                <div className="bar" style={{ transform: `translateY(${100 - h}%)` }}>
                  <span className={`bar-val${showVal ? ' on' : ''}`}>{gbp0(d.total)}</span>
                </div>
              </div>
              <span className="bar-x">{many && i % 3 !== 0 && !isLast ? '' : label(d.month)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
