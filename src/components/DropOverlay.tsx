import { FileUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const isFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

/** Drag a file anywhere on the site to sweep it. Also stops the browser from opening a dropped file
 *  and leaving the site, which is what happened before when a file missed the drop zone. */
export function DropOverlay({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [on, setOn] = useState(false);
  const depth = useRef(0);
  const cb = useRef(onFiles);
  cb.current = onFiles;
  useEffect(() => {
    const enter = (e: DragEvent) => { if (!isFiles(e)) return; e.preventDefault(); depth.current++; setOn(true); };
    const over = (e: DragEvent) => { if (!isFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; };
    const leave = (e: DragEvent) => { if (!isFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (depth.current === 0 || e.relatedTarget === null) { depth.current = 0; setOn(false); } };
    const drop = (e: DragEvent) => {
      if (!isFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setOn(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) cb.current(files);
    };
    addEventListener('dragenter', enter); addEventListener('dragover', over); addEventListener('dragleave', leave); addEventListener('drop', drop);
    return () => { removeEventListener('dragenter', enter); removeEventListener('dragover', over); removeEventListener('dragleave', leave); removeEventListener('drop', drop); };
  }, []);
  return (
    <div className={`drop-overlay${on ? ' on' : ''}`} aria-hidden={!on}>
      <div className="drop-overlay-card">
        <span className="drop-icon big"><FileUp size={28} strokeWidth={1.5} /></span>
        <b>Drop to sweep it</b>
        <span>Read on this device. Never uploaded</span>
      </div>
    </div>
  );
}
