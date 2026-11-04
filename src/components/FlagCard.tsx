import { CalendarClock, CircleHelp, CirclePlus, Copy, Hourglass, Layers, Receipt, TrendingUp, type LucideIcon } from 'lucide-react';
import { gbp, gbp0, type Flag } from '../engine';

export const FLAG_ICON: Record<Flag['type'], LucideIcon> = {
  duplicate: Copy, 'price-rise': TrendingUp, 'trial-converted': Hourglass, new: CirclePlus,
  'renewal-soon': CalendarClock, 'double-charge': Receipt, stack: Layers, unknown: CircleHelp,
};
export const FLAG_NAME: Record<Flag['type'], string> = {
  duplicate: 'Duplicate', 'price-rise': 'Price rise', 'trial-converted': 'Trial ended', new: 'New',
  'renewal-soon': 'Renews soon', 'double-charge': 'Charged twice', stack: 'Stack', unknown: 'Unnamed',
};

export function FlagCard({ f }: { f: Flag }) {
  const Icon = FLAG_ICON[f.type];
  return (
    <article className={`flag-card sev-${f.severity}`}>
      <Icon size={18} strokeWidth={1.5} aria-hidden />
      <h3>{f.title}<span className="tag">{FLAG_NAME[f.type].toLowerCase()}</span></h3>
      {/* Members think in monthly outgoings (Trustpilot research), so lead with the month unless it's a once-a-year or one-off amount. */}
      <div className="impact">{f.impactPeriod === 'none' ? 'check the deal' : f.impactPeriod === 'once' || f.type === 'renewal-soon' ? gbp(f.impact) : `${gbp(f.impact / 12)}/mo`}</div>
      <p>{f.detail}</p>
      <div className="basis">{f.impactPeriod === 'once' || f.impactPeriod === 'none' ? f.basis : f.type === 'renewal-soon' ? 'charged once a year' : `${gbp0(f.impact)}/yr · ${f.basis}`}</div>
    </article>
  );
}
