import { FileUp, Lock } from 'lucide-react';
import { useRef } from 'react';

export type OnFiles = (files: File[], mode?: 'replace' | 'add') => void;

/** The drop zone. Files are read in the browser; nothing is uploaded anywhere.
 *  Dropping is handled for the whole window (see DropOverlay), so this only offers the picker. */
export function Upload({ onFiles, compact = false, mode = 'replace' }: { onFiles: OnFiles; compact?: boolean; mode?: 'replace' | 'add' }) {
  const input = useRef<HTMLInputElement>(null);
  const pick = (list: FileList | null) => {
    const files = list ? [...list] : [];
    // Reset so picking the same file again still counts as a change.
    if (input.current) input.current.value = '';
    if (files.length) onFiles(files, mode);
  };
  return (
    <div className={`drop${compact ? ' compact' : ''}`}>
      <span className="drop-icon"><FileUp size={20} strokeWidth={1.5} aria-hidden /></span>
      {!compact && <p className="drop-title"><b>Drop a bank statement here</b><span>or several: current account and credit card</span></p>}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}>Choose {compact ? 'files' : 'a file'}</button>
      <input ref={input} type="file" multiple accept=".csv,.txt,.tsv,.ofx,.qif,text/csv,text/plain" hidden onChange={e => pick(e.target.files)} data-testid="file-input" />
      <p className="muted lock"><Lock size={14} strokeWidth={1.5} aria-hidden /> Read on this device. Never uploaded</p>
      {!compact && <div className="formats">CSV from Monzo · Starling · Barclays · Lloyds · HSBC · NatWest · Nationwide · Revolut · Amex · Santander text · OFX · QIF</div>}
    </div>
  );
}
