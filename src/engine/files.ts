import { parseBankCsv, parseOfx, parseQif, type ParseReport } from './csv';

/** Bytes → text. UK banks still export old Windows text (Nationwide: £ is byte 0xA3), and a few use UTF-16. */
export function decodeBytes(b: Uint8Array): { text: string; encoding: 'UTF-8' | 'UTF-16' | 'Windows-1252' } {
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(b.subarray(2)), encoding: 'UTF-16' };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(b.subarray(2)), encoding: 'UTF-16' };
  // UTF-16 with no BOM: every other byte is zero.
  const probe = b.subarray(0, 400);
  let oddZeros = 0;
  for (let i = 1; i < probe.length; i += 2) if (probe[i] === 0) oddZeros++;
  if (probe.length > 8 && oddZeros / (probe.length / 2) > 0.4) return { text: new TextDecoder('utf-16le').decode(b), encoding: 'UTF-16' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'UTF-8' }; }
  catch { return { text: new TextDecoder('windows-1252').decode(b), encoding: 'Windows-1252' }; }
}

export type FileKind = 'text' | 'ofx' | 'qif' | 'pdf' | 'spreadsheet' | 'html' | 'image' | 'binary';

/** What kind of file this really is, from its first bytes, not its name. */
export function sniffKind(b: Uint8Array): FileKind {
  const at = (...sig: number[]) => sig.every((x, i) => b[i] === x);
  if (at(0x25, 0x50, 0x44, 0x46)) return 'pdf';                                    // %PDF
  if (at(0x50, 0x4b, 0x03, 0x04) || at(0xd0, 0xcf, 0x11, 0xe0)) return 'spreadsheet'; // xlsx/numbers (zip), old xls
  if (at(0x89, 0x50, 0x4e, 0x47) || at(0xff, 0xd8, 0xff) || (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)) return 'image'; // png, jpeg, heic
  const head = new TextDecoder('latin1').decode(b.subarray(0, 1024)).replace(/\0/g, '');
  if (/OFXHEADER|<OFX>/i.test(head)) return 'ofx';
  if (/^\s*!Type:/i.test(head)) return 'qif';
  if (/^\s*(<!doctype html|<html|<table|<\?xml[^>]*>\s*<Workbook)/i.test(head)) return 'html';
  let ctrl = 0;
  const p = b.subarray(0, 2048);
  for (const x of p) if (x < 9 || (x > 13 && x < 32)) ctrl++;
  if (p.length && ctrl / p.length > 0.1 && !(b[0] === 0xff && b[1] === 0xfe) && !(p.length > 8 && b[1] === 0)) return 'binary';
  return 'text';
}

const HOW = 'In your banking app or online banking, look for Export or Download transactions and choose CSV.';
const WRONG_FILE: Record<Exclude<FileKind, 'text' | 'ofx' | 'qif'>, { format: string; message: string }> = {
  pdf: { format: 'PDF', message: `That's a PDF statement. Sweep reads the CSV download instead. ${HOW}` },
  spreadsheet: { format: 'Spreadsheet', message: 'That\'s a spreadsheet (Excel or Numbers). Open it and save it as CSV, or download the CSV version from your bank.' },
  html: { format: 'Web page', message: `That file is a web page saved with a spreadsheet name (some banks' "Excel" downloads are). Download the CSV or text version instead.` },
  image: { format: 'Image', message: `That's a picture, not a statement file. ${HOW}` },
  binary: { format: 'Unknown', message: `Sweep can't read that file. ${HOW}` },
};

export interface StatementRead extends ParseReport { name: string; encoding?: string }

/** Read one uploaded file. Pure: bytes in, payments out. Nothing leaves the device. */
export function readStatement(name: string, bytes: Uint8Array): StatementRead {
  const kind = sniffKind(bytes);
  if (kind !== 'text' && kind !== 'ofx' && kind !== 'qif') {
    const w = WRONG_FILE[kind];
    return { name, txns: [], format: w.format, skipped: 0, warnings: [w.message], notes: [], fatal: true };
  }
  if (bytes.length === 0) return { name, txns: [], format: 'empty', skipped: 0, warnings: ['The file is empty.'], notes: [] };
  const { text, encoding } = decodeBytes(bytes);
  const rep = kind === 'ofx' ? parseOfx(text) : kind === 'qif' ? parseQif(text) : parseBankCsv(text);
  if (encoding !== 'UTF-8' && rep.txns.length) rep.notes.unshift(`Read as ${encoding} text, an older format some banks still use.`);
  return { ...rep, name, encoding };
}

/** Several files at once (current account + credit card). If the same file goes in twice, each payment counts once:
 *  a payment appears as many times as the file with the most copies of it has it. */
export function mergeStatements(reads: StatementRead[]) {
  const best = new Map<string, { t: StatementRead['txns'][number]; n: number }>();
  let total = 0;
  for (const r of reads) {
    const here = new Map<string, number>();
    for (const t of r.txns) {
      total++;
      const k = `${t.date}|${t.description.toUpperCase()}|${t.amount}`;
      const n = (here.get(k) ?? 0) + 1;
      here.set(k, n);
      if (n > (best.get(k)?.n ?? 0)) best.set(k, { t, n });
    }
  }
  const txns = [...best.values()].flatMap(({ t, n }) => Array.from({ length: n }, () => ({ ...t })));
  txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { txns, dupes: total - txns.length };
}
