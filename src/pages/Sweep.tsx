import { FlagCard } from '../components/FlagCard';
import { Phone } from '../components/Phone';
import { SpendChart } from '../components/SpendChart';
import { Upload } from '../components/Upload';
import { HOUSEHOLDS, owner, sweepHousehold } from '../data';
import { CATEGORY_LABEL, fmtDate, gbp, gbp0, type Series, type SweepResult } from '../engine';

export interface UploadState { name: string; format: string; skipped: number; warnings: string[]; result: SweepResult; txnCount: number }

const every = (s: Series) => ({ weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' })[s.cadence];

function SrcTag({ s }: { s: Series }) {
  const src = s.merchant.source;
  return <span className={`src ${src}`}>{src === 'dictionary' ? 'rules' : src === 'ai' ? `AI ${Math.round((s.merchant.confidence ?? 0) * 100)}%` : 'unnamed'}</span>;
}

export function Sweep({ id, upload, onFile }: { id: string; upload: UploadState | null; onFile: (name: string, text: string) => void }) {
  const isYours = id === 'yours';
  const h = HOUSEHOLDS.find(x => x.id === id);
  let result: SweepResult | null = null, format = '', firstName = 'there', title = '', count = 0;
  if (isYours && upload) { result = upload.result; format = upload.format; title = 'Your sweep'; count = upload.txnCount; }
  else if (h) { const s = sweepHousehold(h.id); result = s.result; format = s.format; firstName = h.firstName; title = `${owner(h)}'s sweep`.replace("family's", "family's"); count = s.txns.length; }

  const tabs = (
    <nav className="seg" aria-label="Choose a household">
      {HOUSEHOLDS.map(x => <a key={x.id} href={`#/sweep/${x.id}`} aria-current={x.id === id ? 'page' : undefined}>{owner(x)}</a>)}
      <a href="#/sweep/yours" aria-current={isYours ? 'page' : undefined}>Your file</a>
    </nav>
  );

  // A file we couldn't read must never look like "all clear". Show what went wrong instead.
  if (isYours && upload && upload.txnCount === 0) {
    return (
      <div className="wrap">
        <div className="page-head"><div><h1>Your sweep</h1><div className="meta-line"><span>{upload.name}</span><span className="warn">0 payments read</span></div></div>{tabs}</div>
        <div className="report" role="alert">
          <span><b>We couldn't read any payments from {upload.name}.</b></span>
          {upload.warnings.map((w, i) => <span key={i} className="warn">{w}</span>)}
          <span>Export a CSV from your banking app's Statements or Export screen and try again.</span>
        </div>
        <div style={{ marginTop: 16 }}><Upload onFile={onFile} /></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="wrap">
        <div className="page-head"><div><h1>Your sweep</h1><div className="meta-line"><span>Nothing uploaded yet</span></div></div>{tabs}</div>
        <Upload onFile={onFile} />
      </div>
    );
  }

  const flaggedIds = new Set(result.flags.flatMap(f => (f.savingSeriesId ? [f.savingSeriesId] : f.seriesIds)));
  const periodLabel = `${fmtDate(result.period.start, { day: 'numeric', month: 'short', year: 'numeric' })} to ${fmtDate(result.period.end, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="wrap fade-in">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="meta-line"><span>{periodLabel}</span><span>{format} export</span><span>{count} payments read</span>{isYours && upload?.skipped ? <span className="warn">{upload.skipped} rows skipped</span> : null}</div>
        </div>
        {tabs}
      </div>

      {isYours && upload && (
        <div className="report" role="status">
          <span><b>{upload.name}</b> read on this device</span>
          <span>Format: <b>{upload.format}</b></span>
          {upload.warnings.map((w, i) => <span key={i} className="warn">{w}</span>)}
          {result.unlabelled.length > 0 && <span>{result.unlabelled.length} repeat payment{result.unlabelled.length > 1 ? 's' : ''} the rules can't name. AI naming runs offline, so they're marked "unnamed"</span>}
        </div>
      )}
      {isYours && upload && (
        <details className="another">
          <summary>Sweep a different file</summary>
          <Upload onFile={onFile} compact />
        </details>
      )}

      <section className="stats" style={{ marginTop: 16 }}>
        <div className="stat lead">
          <span className="label">Worth a look</span>
          <span className="value">{gbp0(result.totals.worthALookAnnual)}<span style={{ fontSize: 16, color: 'var(--text-2)' }}> a year</span></span>
          <span className="sub">{gbp(result.totals.worthALookAnnual / 12)} a month · {result.flags.length} flag{result.flags.length === 1 ? '' : 's'}, each payment counted once</span>
        </div>
        <div className="stat"><span className="label">Subscriptions</span><span className="value">{result.subscriptions.length}</span><span className="sub">{gbp0(result.totals.subscriptionsAnnual)} a year</span></div>
        <div className="stat"><span className="label">Bills Nous can check</span><span className="value">{result.bills.length}</span><span className="sub">{gbp0(result.totals.billsAnnual)} a year</span></div>
        <div className="stat"><span className="label">To claim back</span><span className="value">{gbp(result.totals.toClaimBack)}</span><span className="sub">{result.totals.toClaimBack > 0 ? 'double charges, not refunded' : 'no double charges found'}</span></div>
      </section>

      <div className="results">
        <section>
          <div className="panel-title"><h2>Worth a look</h2><span className="count">{result.flags.length} found · most urgent first</span></div>
          <div className="flags">
            {result.flags.length ? result.flags.map(f => <FlagCard key={f.id} f={f} />) : <p className="muted">Nothing looks off. Nice.</p>}
          </div>
        </section>
        <Phone result={result} firstName={firstName} />
      </div>

      <SpendChart result={result} />

      <section className="table-card">
        <div className="panel-title"><h2>All subscriptions</h2><span className="count">{result.subscriptions.length} active · named by rules, AI or neither</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Service</th><th>Type</th><th>Every</th><th className="r">Price</th><th className="r">A year</th><th>Next charge</th><th>Since</th><th>Named by</th></tr></thead>
            <tbody>
              {result.subscriptions.map(s => (
                <tr key={s.id}>
                  <td><span className={flaggedIds.has(s.id) ? 'mark' : ''}>{s.merchant.name}</span>{s.productHint && <span className="hint">{s.productHint}</span>}</td>
                  <td className="secondary">{CATEGORY_LABEL[s.merchant.category]}</td>
                  <td className="secondary">{every(s)}</td>
                  <td className="r num">{gbp(s.currentAmount)}</td>
                  <td className="r num">{gbp(s.annualCost)}</td>
                  <td className="num secondary">{fmtDate(s.nextDue)}</td>
                  <td className="num secondary">{fmtDate(s.firstDate, { month: 'short', year: 'numeric' })}</td>
                  <td><SrcTag s={s} /></td>
                </tr>
              ))}
              {result.ended.filter(s => s.merchant.kind !== 'bill').map(s => (
                <tr key={s.id} className="ended">
                  <td>{s.merchant.name}<span className="hint">stopped</span></td>
                  <td>{CATEGORY_LABEL[s.merchant.category]}</td><td>{every(s)}</td>
                  <td className="r num">{gbp(s.currentAmount)}</td><td className="r num">–</td>
                  <td className="num">last {fmtDate(s.lastDate)}</td><td className="num">{fmtDate(s.firstDate, { month: 'short', year: 'numeric' })}</td><td><SrcTag s={s} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="lists">
        <section className="mini">
          <h2>Bills Nous can check</h2>
          <p>Energy, broadband, mobile, insurance, TV. Nous's core job</p>
          <ul>{result.bills.length ? result.bills.map(s => <li key={s.id}><span>{s.merchant.name}<span className="hint muted"> {CATEGORY_LABEL[s.merchant.category].toLowerCase()}</span></span><span className="num">{gbp(s.currentAmount)}/{every(s).replace('month', 'mo').replace('year', 'yr')}</span></li>) : <li className="empty">None found</li>}</ul>
        </section>
        <section className="mini">
          <h2>Fixed costs</h2>
          <p>Found, but not something to switch</p>
          <ul>{result.fixed.length ? result.fixed.map(s => <li key={s.id}><span>{s.merchant.name}</span><span className="num">{gbp(s.currentAmount)}/{every(s).replace('month', 'mo').replace('year', 'yr')}</span></li>) : <li className="empty">None found</li>}</ul>
        </section>
        <section className="mini">
          <h2>Left out on purpose</h2>
          <p>Repeats that aren't subscriptions</p>
          <ul>
            <li><span>Food shops, coffee, takeaways</span><span className="muted">spending</span></li>
            <li><span>Taxis, buses, fuel</span><span className="muted">spending</span></li>
            <li><span>Money to people</span><span className="muted">transfers</span></li>
            <li><span>Refunded charges</span><span className="muted">cancelled out</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
