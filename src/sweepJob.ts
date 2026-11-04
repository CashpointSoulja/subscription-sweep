import labels from './data/merchant-labels.json';
import { mergeStatements, readStatement, sweep, type AiLabels, type StatementRead, type SweepResult } from './engine';

export interface SweepJob { files: { name: string; bytes: ArrayBuffer }[]; previous: StatementRead[] }
export interface SweepOut { reads: StatementRead[]; result: SweepResult; txnCount: number; dupes: number }

/** Read every file, merge them, sweep. Pure: runs in the worker, or on the page if workers aren't available. */
export function runJob(job: SweepJob): SweepOut {
  const reads = [...job.previous, ...job.files.map(f => readStatement(f.name, new Uint8Array(f.bytes)))];
  const { txns, dupes } = mergeStatements(reads.filter(r => !r.fatal));
  return { reads, result: sweep(txns, { ai: labels as unknown as AiLabels }), txnCount: txns.length, dupes };
}
