import { CalendarClock, ChevronDown, CircleHelp, CirclePlus, Copy, Hourglass, Layers, Receipt, TrendingUp, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { fmtDate, gbp, gbp0, type Flag, type Series } from '../engine';

export const FLAG_ICON: Record<Flag['type'], LucideIcon> = {
  duplicate: Copy, 'price-rise': TrendingUp, 'trial-converted': Hourglass, new: CirclePlus,
  'renewal-soon': CalendarClock, 'double-charge': Receipt, stack: Layers, unknown: CircleHelp,
};
export const FLAG_NAME: Record<Flag['type'], string> = {
  duplicate: 'Duplicate', 'price-rise': 'Price rise', 'trial-converted': 'Trial ended', new: 'New',
  'renewal-soon': 'Renews soon', 'double-charge': 'Charged twice', stack: 'Stack', unknown: 'Unnamed',
};
const EVERY = { weekly: 'a week', monthly: 'a month', quarterly: 'a quarter', yearly: 'a year' } as const;
const SHOW = 6;

/** The payments behind one series, newest first, with the ones that triggered the flag highlighted. */
function Evidence({ s }: { s: Series }) {
  const extra = new Set(s.extraCharges);
  const rows = [...s.charges, ...s.extraCharges].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const why = (t: Series['charges'][number]) =>
    extra.has(t) ? 'extra charge' : s.priceChangeDate === t.date ? 'new price' : null;
  return (
    <div className="ev">
      <div className="ev-head"><b>{s.merchant.name}</b><span className="num">{gbp(s.currentAmount)} {EVERY[s.cadence]}</span></div>
      <ul>
        {rows.slice(0, SHOW).map((t, i) => {
          const w = why(t);
          return <li key={i}><span className="num">{fmtDate(t.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="num"><span className={w ? 'mark' : ''}>{gbp(Math.abs(t.amount))}</span></span><span className="ev-why">{w ?? ''}</span></li>;
        })}
        {s.trialStart && <li><span className="num">{fmtDate(s.trialStart, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="num"><span className="mark">trial</span></span><span className="ev-why">free or cheap start</span></li>}
      </ul>
      {rows.length > SHOW && <div className="ev-more">and {rows.length - SHOW} earlier</div>}
      <div className="ev-raw">Bank text: <span className="mono">{s.charges[0]?.description}</span></div>
    </div>
  );
}

export function FlagCard({ f, series = [] }: { f: Flag; series?: Series[] }) {
  const Icon = FLAG_ICON[f.type];
  const [open, setOpen] = useState(false);
  const id = useId();
  const canOpen = series.length > 0;
  return (
    <article className={`flag-card sev-${f.severity}${open ? ' open' : ''}${canOpen ? ' can-open' : ''}`}>
      <div className="flag-head">
        <Icon size={18} strokeWidth={1.5} aria-hidden />
        <h3>
          {canOpen
            ? <button type="button" className="flag-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>{f.title}</button>
            : f.title}
          <span className="tag">{FLAG_NAME[f.type].toLowerCase()}</span>
        </h3>
        {/* Members think in monthly outgoings (Trustpilot research), so lead with the month unless it's a once-a-year or one-off amount. */}
        <div className="impact">{f.impactPeriod === 'none' ? 'check the deal' : f.impactPeriod === 'once' || f.type === 'renewal-soon' ? gbp(f.impact) : `${gbp(f.impact / 12)}/mo`}</div>
        <p>{f.detail}</p>
        <div className="basis">{f.impactPeriod === 'once' || f.impactPeriod === 'none' ? f.basis : f.type === 'renewal-soon' ? 'charged once a year' : `${gbp0(f.impact)}/yr · ${f.basis}`}</div>
        {canOpen && <ChevronDown className="chev" size={16} strokeWidth={1.5} aria-hidden />}
      </div>
      {canOpen && (
        <div className="flag-more" id={id} role="region" aria-label={`The payments behind: ${f.title}`} inert={!open}>
          <div className="flag-more-inner">
            <p className="ev-intro">The payments behind this, newest first. Every £ on this page comes from rows like these.</p>
            <div className="ev-grid">{series.map(s => <Evidence key={s.id} s={s} />)}</div>
          </div>
        </div>
      )}
    </article>
  );
}
