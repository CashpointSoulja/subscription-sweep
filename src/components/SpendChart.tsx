import { addDays, addMonths } from '../engine/dates';
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
  if (data.length < 2) return null;
  const W = 720, H = 220, pad = { t: 24, b: 28 };
  const max = Math.max(...data.map(d => d.total)) * 1.12 || 1;
  const bw = W / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const first = data[0].total, last = data[data.length - 1].total, diff = last - first;
  const label = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return (
    <section className="chart-card">
      <div className="chart-head">
        <div>
          <h2>What your subscriptions cost per month</h2>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Everything you're signed up to that month. Yearly plans spread over 12 months</div>
        </div>
        <span className="delta tnum">{gbp0(first)} in {label(data[0].month)} → {gbp0(last)} in {label(data[data.length - 1].month)}{Math.abs(diff) >= 1 && <> · {diff > 0 ? 'up' : 'down'} {gbp0(Math.abs(diff))} a month</>}</span>
      </div>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Monthly subscription cost, ${gbp0(first)} to ${gbp0(last)}`}>
          {[0.25, 0.5, 0.75, 1].map(p => <line key={p} x1={0} x2={W} y1={y(max * p / 1.12)} y2={y(max * p / 1.12)} stroke="rgba(31,27,22,0.07)" />)}
          {data.map((d, i) => {
            const isLast = i === data.length - 1;
            return (
              <g key={d.month}>
                <rect x={i * bw + bw * 0.18} y={y(d.total)} width={bw * 0.64} height={Math.max(H - pad.b - y(d.total), 1)} rx={4} fill={isLast ? '#17663f' : '#d8d0c2'} />
                {(isLast || i === 0) && <text x={i * bw + bw / 2} y={y(d.total) - 8} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill={isLast ? '#17663f' : '#7b7266'}>{gbp0(d.total)}</text>}
                <text x={i * bw + bw / 2} y={H - 8} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#7b7266">{label(d.month)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
