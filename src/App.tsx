import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { DropOverlay } from './components/DropOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Segmented } from './components/Segmented';
import type { OnFiles } from './components/Upload';
import { HOUSEHOLDS, owner } from './data';
import { prefersReducedMotion } from './motion';
import { Accuracy } from './pages/Accuracy';
import { DOCS } from './docs';
import { How } from './pages/How';
import { Landing } from './pages/Landing';
import { Sweep, type UploadState } from './pages/Sweep';
import { MAX_FILE_MB, sweepFiles } from './sweepFiles';

// The docs (markdown + parser) stay out of the first download, then load quietly once the page is idle,
// so opening Docs is still instant.
const loadDoc = () => import('./pages/Doc');
const Doc = lazy(() => loadDoc().then(m => ({ default: m.Doc })));
if (typeof window !== 'undefined') {
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 1500));
  addEventListener('load', () => idle(() => { void loadDoc(); }), { once: true });
}

const getRoute = () => location.hash.replace(/^#/, '') || '/';
const sectionOf = (r: string) => r.split('/')[1] ?? '';

function useRoute() {
  const [route, setRoute] = useState(getRoute);
  const prev = useRef(route);
  useEffect(() => {
    const on = () => {
      const r = getRoute();
      // New page: start at the top. Switching household inside the sweep page: stay put (the page handles it).
      if (sectionOf(r) !== sectionOf(prev.current) || sectionOf(r) === 'docs') scrollTo(0, 0);
      prev.current = r;
      setRoute(r);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

const NAV = [
  { id: 'sweep', label: 'Sample sweep', href: '#/sweep/priya', className: 'keep' },
  { id: 'how', label: 'How it works', href: '#/how' },
  { id: 'accuracy', label: 'Accuracy', href: '#/accuracy' },
  { id: 'docs', label: 'Docs', href: '#/docs/memo', className: 'keep' },
];
const MIN_SWEEP_MS = 900; // long enough to see it work, short enough not to wait

function titleFor(section: string, arg: string | undefined) {
  if (section === 'sweep') {
    const h = HOUSEHOLDS.find(x => x.id === (arg ?? 'priya'));
    return h ? `${owner(h)}'s sweep` : arg === 'yours' ? 'Your sweep' : 'Not found';
  }
  if (section === 'how') return 'How it works';
  if (section === 'accuracy') return 'Accuracy';
  if (section === 'docs') return DOCS.find(d => d.id === (arg ?? 'memo'))?.title ?? 'Docs';
  return section ? 'Not found' : '';
}

export default function App() {
  const route = useRoute();
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [busy, setBusy] = useState<string[] | null>(null);
  const [uploadError, setUploadError] = useState('');
  const uploadRef = useRef(upload);
  uploadRef.current = upload;

  const onFiles: OnFiles = useCallback(async (files, mode = 'replace') => {
    if (!files.length) return;
    location.hash = '/sweep/yours';
    const big = files.find(f => f.size > MAX_FILE_MB * 1024 * 1024);
    if (big) { setUploadError(`${big.name} is over ${MAX_FILE_MB}MB. Export a shorter date range, like the last 12 months.`); return; }
    setUploadError('');
    setBusy(files.map(f => f.name));
    const t0 = performance.now();
    try {
      const out = await sweepFiles(files, mode === 'add' ? uploadRef.current?.reads ?? [] : []);
      const wait = MIN_SWEEP_MS - (performance.now() - t0);
      if (wait > 0 && !prefersReducedMotion()) await new Promise(r => setTimeout(r, wait));
      setUpload({ id: Date.now(), ...out });
    } catch {
      setUploadError("Something went wrong reading that file. Nothing was uploaded. Try exporting it again as CSV.");
    } finally {
      setBusy(null);
    }
  }, []);
  const onClear = useCallback(() => { setUpload(null); setUploadError(''); }, []);

  const [, section = '', arg] = route.split('/');
  useEffect(() => {
    const t = titleFor(section, arg);
    document.title = t ? `${t} · Subscription Sweep` : 'Subscription Sweep: find what you forgot you\'re paying for';
  }, [section, arg]);

  let page;
  if (section === 'sweep') page = <Sweep id={arg ?? 'priya'} upload={upload} busy={busy} uploadError={uploadError} onFiles={onFiles} onClear={onClear} />;
  else if (section === 'how') page = <How />;
  else if (section === 'accuracy') page = <Accuracy />;
  else if (section === 'docs') page = <Suspense fallback={<div className="wrap"><div className="page-head"><div className="meta-line"><span>Opening the docs…</span></div></div></div>}><Doc id={arg ?? 'memo'} /></Suspense>;
  else if (section === '') page = <Landing onFiles={onFiles} />;
  else page = <NotFound />;

  return (
    <>
      <a className="skip" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="nav">
        <div className="wrap">
          <a className="logo" href="#/"><span className="logo-mark"><span /></span>Subscription Sweep</a>
          <Segmented items={NAV} current={NAV.find(n => n.id === section)?.id} label="Main" className="nav-links" keys={false} />
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <ErrorBoundary resetKey={route}>
          <div className="page" key={section}>{page}</div>
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <div className="wrap">
          <span>Subscription Sweep is a concept by Ayo Ahmed for Nous's Product Builder role. Not affiliated with or endorsed by Nous. The sample households are made up.</span>
          <span><a href="#/docs/PRD">PRD</a> · <a href="#/docs/build-log">Build log</a> · <a href="#/accuracy">Accuracy</a></span>
        </div>
      </footer>
      <DropOverlay onFiles={onFiles} />
    </>
  );
}

function NotFound() {
  return (
    <div className="wrap">
      <div className="page-head"><h1>That page doesn't exist</h1><div className="meta-line"><span>{location.hash || '/'}</span></div></div>
      <div className="report"><span><a href="#/">Home</a> · <a href="#/sweep/priya">Sample sweep</a> · <a href="#/sweep/yours">Sweep your file</a></span></div>
    </div>
  );
}
