import { useCallback, useEffect, useState } from 'react';
import { AI_LABELS } from './data';
import { parseBankCsv, sweep } from './engine';
import { Accuracy } from './pages/Accuracy';
import { Doc } from './pages/Doc';
import { How } from './pages/How';
import { Landing } from './pages/Landing';
import { Sweep, type UploadState } from './pages/Sweep';

function useRoute() {
  const get = () => location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => { setRoute(get()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const [upload, setUpload] = useState<UploadState | null>(null);

  const onFile = useCallback((name: string, text: string) => {
    const report = parseBankCsv(text);
    const result = sweep(report.txns, { ai: AI_LABELS });
    setUpload({ name, format: report.format, skipped: report.skipped, warnings: report.warnings, result, txnCount: report.txns.length });
    location.hash = '/sweep/yours';
  }, []);

  const [, section, arg] = route.split('/');
  let page;
  if (section === 'sweep') page = <Sweep id={arg ?? 'priya'} upload={upload} onFile={onFile} />;
  else if (section === 'how') page = <How />;
  else if (section === 'accuracy') page = <Accuracy />;
  else if (section === 'docs') page = <Doc id={arg ?? 'memo'} />;
  else page = <Landing onFile={onFile} />;

  const cur = (s: string) => (section === s ? 'page' : undefined);
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <a className="logo" href="#/"><span className="logo-mark"><span /></span>Subscription Sweep</a>
          <nav className="nav-links" aria-label="Main">
            <a href="#/sweep/priya" aria-current={cur('sweep')} className="keep">Sample sweep</a>
            <a href="#/how" aria-current={cur('how')}>How it works</a>
            <a href="#/accuracy" aria-current={cur('accuracy')}>Accuracy</a>
            <a href="#/docs/memo" aria-current={cur('docs')} className="keep">Docs</a>
          </nav>
        </div>
      </header>
      <main>{page}</main>
      <footer className="footer">
        <div className="wrap">
          <span>Subscription Sweep is a concept by Ayo Ahmed for Nous's Product Builder role. Not affiliated with or endorsed by Nous. The sample households are made up.</span>
          <span><a href="#/docs/PRD">PRD</a> · <a href="#/docs/build-log">Build log</a> · <a href="#/accuracy">Accuracy</a></span>
        </div>
      </footer>
    </>
  );
}
