import { useEffect, useState } from 'react';

const STEPS = ['Reading', 'Finding payments that repeat', 'Checking prices and dates'];

/** Shown while a file is read: a highlighter running down a statement. */
export function Sweeping({ names }: { names: string[] }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { const id = setInterval(() => setPhase(p => Math.min(p + 1, STEPS.length - 1)), 320); return () => clearInterval(id); }, []);
  const what = phase === 0 ? `${STEPS[0]} ${names.length > 1 ? `${names.length} files` : names[0] ?? 'your file'}` : STEPS[phase];
  return (
    <div className="sweeping" role="status" aria-live="polite">
      <div className="sw-paper" aria-hidden="true">
        {[86, 64, 78, 52, 92, 70, 58].map((w, i) => <span key={i} className="sw-line" style={{ width: `${w}%`, ['--i' as string]: i }} />)}
        <span className="sw-bar" />
      </div>
      <p className="sw-text">{what}…</p>
      <p className="muted sw-sub">On this device. Nothing is uploaded</p>
    </div>
  );
}
