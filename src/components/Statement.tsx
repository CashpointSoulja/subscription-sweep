import { fmtDate, gbp, gbp0 } from '../engine';
import { sweepHousehold } from '../data';

// The hero is Priya's real October statement from the sample data, marked up by the real engine output.
// dy nudges notes on neighbouring lines apart so they never overlap.
const NOTES: { match: (d: string, a: number) => boolean; note: string; dy: number }[] = [
  { match: d => d.startsWith('NETFLIX'), note: 'Up £2.00 a month since July', dy: -14 },
  { match: d => d === 'HINGE', note: 'Was a free trial. Now £24.99', dy: 18 },
  { match: (d, a) => d === 'APPLE.COM/BILL' && a === -10.99, note: 'Apple Music, and Spotify too', dy: 0 },
];
const SHOW = /NETFLIX|HINGE|APPLE\.COM|SPOTIFY|PUREGYM|OCTOPUS|DISNEY|TESCO|PRET|BREAD|HYPEROPTIC|VODAFONE/;

export function Statement() {
  const { result, txns } = sweepHousehold('priya');
  const seenPret = { n: 0 }, seenTesco = { n: 0 };
  const rows = txns
    .filter(t => t.date >= '2026-10-01' && t.amount < 0 && SHOW.test(t.description))
    .filter(t => (/PRET/.test(t.description) ? ++seenPret.n <= 1 : /TESCO/.test(t.description) ? ++seenTesco.n <= 2 : true))
    .slice(0, 14);
  return (
    <div className="statement-stage" aria-label="A bank statement with forgotten subscriptions highlighted">
      <div className="statement draw">
        <div className="st-head">
          <div className="st-bank">Current account</div>
          <div className="st-meta">October 2026 · Priya · sample data</div>
        </div>
        {rows.map((t, i) => {
          const n = NOTES.find(x => x.match(t.description, t.amount));
          return (
            <div key={i} className={`st-row${n ? ' flag' : ''}`} style={{ ['--i' as string]: i }}>
              <span>{fmtDate(t.date)}</span>
              <span className="desc"><span className={n ? 'mark' : ''}>{t.description.replace(/ \d{3}-\d{3}-\d{4}$/, '').slice(0, 26)}</span></span>
              <span className="amt"><span className={n ? 'mark' : ''}>{gbp(-t.amount)}</span></span>
              {n && <span className="st-note" style={{ marginTop: n.dy }}>{n.note}</span>}
            </div>
          );
        })}
        <div className="st-foot">
          <span>{result.subscriptions.length} subscriptions found</span>
          <span><span className="mark">{gbp0(result.totals.worthALookAnnual)} a year worth a look</span></span>
        </div>
      </div>
    </div>
  );
}
