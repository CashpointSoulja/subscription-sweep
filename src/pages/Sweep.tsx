import { ArrowDown, ArrowUp, FileText, RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FlagCard } from '../components/FlagCard';
import { Phone } from '../components/Phone';
import { Segmented } from '../components/Segmented';
import { SpendChart } from '../components/SpendChart';
import { Sweeping } from '../components/Sweeping';
import { Upload, type OnFiles } from '../components/Upload';
import { HOUSEHOLDS, owner, sweepHousehold } from '../data';
import { CATEGORY_LABEL, fmtDate, gbp, gbp0, SHORT_DAYS, type Series, type StatementRead, type SweepResult } from '../engine';
import { Num, prefersReducedMotion } from '../motion';

export interface UploadState { id: number; reads: StatementRead[]; result: SweepResult; txnCount: number; dupes: number }

const every = (s: Series) => ({ weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' })[s.cadence];
const per = (s: Series) => every(s).replace('month', 'mo').replace('year', 'yr').replace('quarter', 'qtr').replace('week', 'wk');
const long = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });
const rv = (i: number) => ({ ['--i' as string]: i }) as CSSProperties;
const TABS = [...HOUSEHOLDS.map(h => ({ id: h.id, label: h.name, href: `#/sweep/${h.id}` })), { id: 'yours', label: 'Your file', href: '#/sweep/yours' }];

function SrcTag({ s }: { s: Series }) {
  const src = s.merchant.source;
  return <span className={`src ${src}`}>{src === 'dictionary' ? 'rules' : src === 'ai' ? `AI ${Math.round((s.merchant.confidence ?? 0) * 100)}%` : 'unnamed'}</span>;
}

interface Props { id: string; upload: UploadState | null; busy: string[] | null; uploadError: string; onFiles: OnFiles; onClear: () => void }

export function Sweep({ id, upload, busy, uploadError, onFiles, onClear }: Props) {
  const isYours = id === 'yours';
  const h = HOUSEHOLDS.find(x => x.id === id);
  const sample = h ? sweepHousehold(h.id) : null;
  const h1 = useRef<HTMLHeadingElement>(null);

  // Switching household keeps the page still. If you're far down, glide back up to the new totals.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (scrollY > 160) scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [id]);
  // After a file is read, move focus to the result for keyboard and screen-reader users, without scrolling.
  useEffect(() => { if (upload && isYours) h1.current?.focus({ preventScroll: true }); }, [upload?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  let title = 'Your sweep', meta: ReactNode = <span>Nothing uploaded yet</span>, body: ReactNode;
  if (sample && h) {
    title = `${owner(h)}'s sweep`;
    meta = <Meta result={sample.result} format={`${sample.format} export`} count={sample.txns.length} />;
    body = <Results key="r" stamp={id} result={sample.result} firstName={h.firstName} />;
  } else if (!isYours) {
    title = 'No such household';
    meta = <span>Try one of the samples above</span>;
    body = <div className="report"><span>There's no sample called "{id}". Pick Priya, the Okafors or Tom above, or sweep your own file.</span></div>;
  } else if (busy) {
    meta = <span>Reading…</span>;
    body = <Sweeping names={busy} />;
  } else if (uploadError) {
    meta = <span className="warn">Not read</span>;
    body = <><div className="report" role="alert"><span className="warn-line"><TriangleAlert size={16} strokeWidth={1.5} aria-hidden /> {uploadError}</span></div><div className="mt16"><Upload onFiles={onFiles} /></div></>;
  } else if (upload && upload.txnCount === 0) {
    // A file we couldn't read must never look like "all clear". Say what went wrong instead.
    meta = <><span>{upload.reads.map(r => r.name).join(', ')}</span><span className="warn">0 payments read</span></>;
    body = (
      <>
        <div className="report" role="alert">
          <span><b>We couldn't read any payments from {upload.reads.length > 1 ? 'those files' : upload.reads[0]?.name}.</b></span>
          {upload.reads.flatMap(r => r.warnings.map((w, i) => <span key={r.name + i} className="warn">{upload.reads.length > 1 ? `${r.name}: ` : ''}{w}</span>))}
          {!upload.reads.some(r => r.fatal) && <span>Export a CSV from your banking app's Statements or Export screen and try again.</span>}
        </div>
        <div className="mt16"><Upload onFiles={onFiles} /></div>
      </>
    );
  } else if (upload) {
    meta = <Meta result={upload.result} format={upload.reads.length > 1 ? `${upload.reads.length} files` : `${upload.reads[0]?.format} export`} count={upload.txnCount} skipped={upload.reads.reduce((a, r) => a + r.skipped, 0)} />;
    body = <Results key="r" stamp={`yours-${upload.id}`} result={upload.result} firstName="there" upload={upload} onFiles={onFiles} onClear={onClear} />;
  } else {
    body = <EmptyYours onFiles={onFiles} />;
  }

  return (
    <>
      <div className="subbar">
        <div className="wrap subbar-in">
          <Segmented items={TABS} current={id} label="Choose a household" />
          <span className="subbar-note">{isYours ? 'Your statement · read on this device' : 'Sample data · a made-up household'}</span>
        </div>
      </div>
      <div className="wrap">
        <header className="page-head">
          <h1 ref={h1} tabIndex={-1} key={title} className="swap-in">{title}</h1>
          <div className="meta-line" key={`m-${id}-${upload?.id ?? 0}-${busy ? 1 : 0}`}>{meta}</div>
        </header>
        {body}
      </div>
    </>
  );
}

function Meta({ result, format, count, skipped = 0 }: { result: SweepResult; format: string; count: number; skipped?: number }) {
  return <><span>{long(result.period.start)} to {long(result.period.end)}</span><span>{format}</span><span>{count.toLocaleString('en-GB')} payments read</span>{skipped > 0 && <span className="warn">{skipped} rows skipped</span>}</>;
}

function EmptyYours({ onFiles }: { onFiles: OnFiles }) {
  return (
    <div className="swap">
      <div className="rv" style={rv(0)}><Upload onFiles={onFiles} /></div>
      <div className="tips">
        <div className="tip rv" style={rv(1)}><b>Where to find it</b><p>In your banking app or online banking, open Statements or Transactions, then Export or Download, and choose CSV. Twelve months gives the full picture.</p></div>
        <div className="tip rv" style={rv(2)}><b>Two accounts?</b><p>Drop your current account and credit card together. A payment that shows up in both is counted once.</p></div>
        <div className="tip rv" style={rv(3)}><b>No statement to hand?</b><p>Download a sample, <a href="samples/priya-monzo.csv" download>Priya's Monzo export</a> or <a href="samples/okafors-nationwide.csv" download>the Okafors' Nationwide one</a>, then drop it here.</p></div>
      </div>
    </div>
  );
}

function FileReport({ upload, onFiles, onClear }: { upload: UploadState; onFiles: OnFiles; onClear: () => void }) {
  const add = useRef<HTMLInputElement>(null);
  const r = upload.result;
  return (
    <div className="report file-report" role="status">
      <div className="file-chips">
        {upload.reads.map((f, i) => (
          <span key={i} className={`file-chip${f.fatal || !f.txns.length ? ' bad' : ''}`}><FileText size={14} strokeWidth={1.5} aria-hidden /><b>{f.name}</b><span className="muted">{f.fatal || !f.txns.length ? 'not read' : `${f.format} · ${f.txns.length.toLocaleString('en-GB')}`}</span></span>
        ))}
      </div>
      <div className="report-notes">
        {upload.dupes > 0 && <span>{upload.dupes} payment{upload.dupes === 1 ? ' was' : 's were'} in more than one file, so counted once.</span>}
        {upload.reads.flatMap(f => [...f.notes, ...f.warnings].map((n, i) => <span key={f.name + i} className={f.warnings.includes(n) ? 'warn' : ''}>{upload.reads.length > 1 ? `${f.name}: ` : ''}{n}</span>))}
        {r.unlabelled.length > 0 && <span>{r.unlabelled.length} repeat payment{r.unlabelled.length > 1 ? 's' : ''} the rules can't name. AI naming runs offline, so they're marked "unnamed".</span>}
      </div>
      <div className="report-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => add.current?.click()}>Add another file</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}><RotateCcw size={14} strokeWidth={1.5} aria-hidden /> Start over</button>
        <input ref={add} type="file" multiple accept=".csv,.txt,.tsv,.ofx,.qif,text/csv,text/plain" hidden data-testid="add-file-input"
          onChange={e => { const files = e.target.files ? [...e.target.files] : []; e.target.value = ''; if (files.length) onFiles(files, 'add'); }} />
      </div>
    </div>
  );
}

function Stats({ result }: { result: SweepResult }) {
  const t = result.totals;
  return (
    <section className="stats" aria-label="Summary">
      <div className="stat lead">
        <span className="label">Worth a look</span>
        <span className="value"><Num value={t.worthALookAnnual} format={gbp0} /><span className="per"> a year</span></span>
        <span className="sub">{gbp(t.worthALookAnnual / 12)} a month · {result.flags.length} flag{result.flags.length === 1 ? '' : 's'}, each payment counted once</span>
      </div>
      <div className="stat"><span className="label">Subscriptions</span><span className="value"><Num value={result.subscriptions.length} format={n => String(Math.round(n))} /></span><span className="sub">{gbp0(t.subscriptionsAnnual)} a year</span></div>
      <div className="stat"><span className="label">Bills Nous can check</span><span className="value"><Num value={result.bills.length} format={n => String(Math.round(n))} /></span><span className="sub">{gbp0(t.billsAnnual)} a year</span></div>
      <div className="stat"><span className="label">To claim back</span><span className="value"><Num value={t.toClaimBack} format={gbp} /></span><span className="sub">{t.toClaimBack > 0 ? 'double charges, not refunded' : 'no double charges found'}</span></div>
    </section>
  );
}

type SortKey = 'name' | 'price' | 'year' | 'next';
function SubsTable({ result, flaggedIds }: { result: SweepResult; flaggedIds: Set<string> }) {
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'year', dir: -1 });
  const rows = useMemo(() => {
    const v = (s: Series) => (sort.k === 'name' ? s.merchant.name.toLowerCase() : sort.k === 'price' ? s.currentAmount : sort.k === 'year' ? s.annualCost : s.nextDue);
    return [...result.subscriptions].sort((a, b) => (v(a) < v(b) ? -1 : v(a) > v(b) ? 1 : 0) * sort.dir);
  }, [result, sort]);
  const th = (k: SortKey, text: string, cls = '') => {
    const on = sort.k === k;
    return (
      <th className={cls} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={`th-sort${on ? ' on' : ''}`} onClick={() => setSort(s => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'name' || k === 'next' ? 1 : -1 }))}>
          {text}{on ? (sort.dir === 1 ? <ArrowUp size={12} strokeWidth={1.75} aria-hidden /> : <ArrowDown size={12} strokeWidth={1.75} aria-hidden />) : <ArrowDown size={12} strokeWidth={1.75} className="ghost" aria-hidden />}
        </button>
      </th>
    );
  };
  return (
    <section className="table-card rv" style={rv(0)}>
      <div className="panel-title"><h2>All subscriptions</h2><span className="count">{result.subscriptions.length} active · named by rules, AI or neither</span></div>
      <div className="table-scroll">
        <table>
          <thead><tr>{th('name', 'Service')}<th>Type</th><th>Every</th>{th('price', 'Price', 'r')}{th('year', 'A year', 'r')}{th('next', 'Next charge')}<th>Since</th><th>Named by</th></tr></thead>
          <tbody className="draw">
            {rows.map((s, i) => (
              <tr key={s.id} className="row-in" style={rv(Math.min(i, 12))}>
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
            {result.subscriptions.length === 0 && <tr><td colSpan={8} className="muted">No subscriptions found in this file.</td></tr>}
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
  );
}

function Results({ result, firstName, stamp, upload, onFiles, onClear }: { result: SweepResult; firstName: string; stamp: string; upload?: UploadState; onFiles?: OnFiles; onClear?: () => void }) {
  const flaggedIds = new Set(result.flags.flatMap(f => (f.savingSeriesId ? [f.savingSeriesId] : f.seriesIds)));
  const byId = new Map(result.series.map(s => [s.id, s]));
  const short = result.period.days < SHORT_DAYS;
  return (
    <>
      {upload && onFiles && onClear && <FileReport upload={upload} onFiles={onFiles} onClear={onClear} />}
      {short && (
        <div className="callout warn-callout mt16" role="note">
          <b>This file only covers {result.period.days} day{result.period.days === 1 ? '' : 's'}.</b> A monthly subscription needs at least two payments to show up, so export 3 to 12 months for the full picture.
        </div>
      )}
      {/* The summary stays in place and its numbers roll between households; everything below re-enters. */}
      <div className="mt16"><Stats result={result} /></div>

      <div className="results swap" key={`f-${stamp}`}>
        <section className="rv" style={rv(0)} aria-label="Worth a look">
          <div className="panel-title"><h2>Worth a look</h2><span className="count">{result.flags.length} found · most urgent first{result.flags.length ? ' · tap one to see the payments' : ''}</span></div>
          <div className="flags">
            {result.flags.length
              ? result.flags.map((f, i) => <div key={f.id} className="rv" style={rv(i + 1)}><FlagCard f={f} series={f.seriesIds.map(x => byId.get(x)).filter((s): s is Series => !!s)} /></div>)
              : <p className="muted empty-flags">{short ? 'Not enough history in this file to spot repeats yet.' : 'Nothing looks off. Nice.'}</p>}
          </div>
        </section>
        <div className="rv phone-col" style={rv(1)}><Phone result={result} firstName={firstName} /></div>
      </div>

      <SpendChart result={result} />

      <div className="swap" key={`t-${stamp}`}>
        <SubsTable result={result} flaggedIds={flaggedIds} />
        <div className="lists">
          <section className="mini rv" style={rv(1)}>
            <h2>Bills Nous can check</h2>
            <p>Energy, broadband, mobile, insurance, TV. Nous's core job</p>
            <ul>{result.bills.length ? result.bills.map(s => <li key={s.id}><span>{s.merchant.name}<span className="hint muted"> {CATEGORY_LABEL[s.merchant.category].toLowerCase()}</span></span><span className="num">{gbp(s.currentAmount)}/{per(s)}</span></li>) : <li className="empty">None found</li>}</ul>
          </section>
          <section className="mini rv" style={rv(2)}>
            <h2>Fixed costs</h2>
            <p>Found, but not something to switch</p>
            <ul>{result.fixed.length ? result.fixed.map(s => <li key={s.id}><span>{s.merchant.name}</span><span className="num">{gbp(s.currentAmount)}/{per(s)}</span></li>) : <li className="empty">None found</li>}</ul>
          </section>
          <section className="mini rv" style={rv(3)}>
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
    </>
  );
}
