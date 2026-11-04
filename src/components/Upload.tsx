import { FileUp, Lock } from 'lucide-react';
import { useRef, useState } from 'react';

/** Reads the file with FileReader in the browser. Nothing is uploaded anywhere. */
export function Upload({ onFile, compact = false }: { onFile: (name: string, text: string) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const read = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError('That file is over 20MB. Export a shorter date range.'); return; }
    if (!/\.(csv|txt)$/i.test(f.name) && f.type && !/csv|text/.test(f.type)) { setError('Export your statement as CSV. Most banking apps have it under Statements or Export.'); return; }
    setError('');
    f.text().then(t => onFile(f.name, t));
  };
  return (
    <div
      className={`drop${over ? ' over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); }}
    >
      <FileUp size={20} strokeWidth={1.5} className="muted" aria-hidden />
      {!compact && <p><b>Drop a bank statement CSV here</b></p>}
      <button className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}>Choose a file</button>
      <input ref={input} type="file" accept=".csv,text/csv,.txt" hidden onChange={e => read(e.target.files?.[0])} data-testid="file-input" />
      <p className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Lock size={14} strokeWidth={1.5} aria-hidden /> Read on this device. Never uploaded</p>
      <div className="formats">Monzo · Starling · Barclays · Nationwide · HSBC · any Date, Description, Amount file</div>
      {error && <p className="warn" role="alert">{error}</p>}
    </div>
  );
}
