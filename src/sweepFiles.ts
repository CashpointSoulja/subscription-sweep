import type { StatementRead } from './engine';
import type { SweepJob, SweepOut } from './sweepJob';

export const MAX_FILE_MB = 25;

/** Reads the files in a background worker; falls back to the page itself if the worker can't start. */
export async function sweepFiles(files: File[], previous: StatementRead[]): Promise<SweepOut> {
  const job: SweepJob = { files: await Promise.all(files.map(async f => ({ name: f.name, bytes: await f.arrayBuffer() }))), previous };
  try {
    return await new Promise<SweepOut>((resolve, reject) => {
      const w = new Worker(new URL('./sweep.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ ok: boolean; out?: SweepOut; error?: string }>) => { w.terminate(); if (e.data.ok && e.data.out) resolve(e.data.out); else reject(new Error(e.data.error)); };
      w.onerror = e => { w.terminate(); reject(new Error(e.message || 'worker failed')); };
      w.postMessage(job);
    });
  } catch {
    const { runJob } = await import('./sweepJob');
    return runJob(job);
  }
}
