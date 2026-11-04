/// <reference lib="webworker" />
import { runJob, type SweepJob } from './sweepJob';

// Runs off the main thread so a 10-year export never freezes the page. Still on this device: a worker can't upload anything.
self.onmessage = (e: MessageEvent<SweepJob>) => {
  try { self.postMessage({ ok: true, out: runJob(e.data) }); }
  catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
