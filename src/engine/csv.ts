import { parseDate } from './dates';
import { resolveMerchant } from './merchants';
import type { Txn } from './types';

/** RFC-4180-ish split: quotes, escaped quotes, delimiters and newlines inside quotes, BOM, CRLF. */
export function splitCsv(text: string, delim = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x.trim() !== '')) rows.push(row);
  return rows;
}

/** Comma, semicolon, tab or pipe: whichever splits the first lines most consistently. */
export function sniffDelimiter(text: string): string {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).slice(0, 20);
  const count = (l: string, d: string) => { let n = 0, q = false; for (const c of l) { if (c === '"') q = !q; else if (!q && c === d) n++; } return n; };
  let best = ',', bestScore = 0;
  for (const d of [',', ';', '\t', '|']) {
    const counts = lines.map(l => count(l, d)).filter(n => n > 0).sort((a, b) => a - b);
    const score = counts.length ? counts[Math.floor(counts.length / 2)] * counts.length : 0;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

/** "£1,240.00" → 1240, "(12.50)" → -12.5, "12.50 DR" → -12.5, "-9.99 GBP" → -9.99, "" → null.
 *  decimalComma: European style "1.240,50" (only used for semicolon files). */
export function parseAmount(raw: string | undefined, decimalComma = false): number | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/[−–]/g, '-').replace(/GBP|EUR|USD/gi, '').replace(/[£$€\s�']/g, '');
  if (decimalComma && /,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  s = s.replace(/,/g, '');
  if (!s) return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
  if (/DR$/i.test(s)) { sign = -1; s = s.replace(/DR$/i, ''); }
  if (/CR$/i.test(s)) s = s.replace(/CR$/i, '');
  if (!/^[-+]?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? sign * n : null;
}

const find = (headers: string[], ...patterns: RegExp[]) => {
  for (const p of patterns) {
    const i = headers.findIndex(h => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

export interface ParseReport {
  txns: Txn[];
  format: string;
  skipped: number;
  /** Problems the member should know about. */
  warnings: string[];
  /** Neutral notes on how the file was read (encoding, card signs, declined payments left out). */
  notes: string[];
  /** True when the file can't be a statement at all (PDF, spreadsheet, image). */
  fatal?: boolean;
}

const HEADER_DATE = /^\s*((transaction|posting|posted|value|booking|started|completed)\s*)?date\s*$/i;
const NOT_REAL = /declined|reverted|failed|cancel+ed|rejected/i;
const CARD_REPAYMENT = /PAYMENT RECEIVED|THANK YOU|DIRECT DEBIT PAYMENT|PAYMENT - THANK|AUTOPAY/i;
/** Text cells exported for Excel often start with an apostrophe ('SKY DIGITAL). */
const clean = (s: string | undefined) => (s ?? '').replace(/ /g, ' ').trim().replace(/^'(?=\S)/, '').replace(/\s{2,}/g, ' ');

/** Santander's "text file" download: one Date:/Description:/Amount: block per payment. */
const isBlockFormat = (text: string) => /^\s*Date:\s/im.test(text) && /^\s*Description:\s/im.test(text) && /^\s*Amount:\s/im.test(text);
function parseBlocks(text: string): ParseReport {
  const txns: Txn[] = [];
  let skipped = 0, cur: { date?: string | null; desc?: string; amount?: number | null } | null = null;
  const flush = () => {
    if (!cur) return;
    if (cur.date && cur.desc && cur.amount != null) txns.push({ date: cur.date, description: cur.desc, amount: Math.round(cur.amount * 100) / 100 });
    else skipped++;
    cur = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.replace(/ /g, ' ').trim();
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^Date:\s*(.+)$/i))) { flush(); cur = { date: parseDate(m[1]) }; }
    else if (cur && (m = l.match(/^Description:\s*(.+)$/i))) cur.desc = clean(m[1]);
    else if (cur && (m = l.match(/^Amount:\s*(.+)$/i))) cur.amount = parseAmount(m[1]);
  }
  flush();
  return finish(txns, 'Santander text file', skipped, [], []);
}

/** OFX (Money / Quicken download): <STMTTRN> blocks with DTPOSTED, TRNAMT, NAME, MEMO. */
export function parseOfx(text: string): ParseReport {
  const txns: Txn[] = [];
  let skipped = 0;
  const tag = (block: string, t: string) => block.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i'))?.[1]?.trim();
  for (const block of text.split(/<STMTTRN>/i).slice(1)) {
    const d = tag(block, 'DTPOSTED'), amt = parseAmount(tag(block, 'TRNAMT')), name = clean(tag(block, 'NAME') || tag(block, 'MEMO'));
    const date = d && /^\d{8}/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
    if (!date || amt == null || !name) { skipped++; continue; }
    txns.push({ date, description: name, amount: Math.round(amt * 100) / 100 });
  }
  return finish(txns, 'OFX', skipped, [], []);
}

/** QIF: records end with ^; D = date (UK banks write it day-first), T/U = amount, P = payee, M = memo. */
export function parseQif(text: string): ParseReport {
  const txns: Txn[] = [];
  let skipped = 0;
  for (const rec of text.split(/^\^\s*$/m)) {
    const f: Record<string, string> = {};
    for (const line of rec.split(/\r?\n/)) if (line.length > 1 && !line.startsWith('!')) f[line[0]] ??= line.slice(1).trim();
    if (!Object.keys(f).length) continue;
    const date = parseDate((f.D ?? '').replace("'", '/')), amt = parseAmount(f.T ?? f.U), name = clean(f.P || f.M);
    if (!date || amt == null || !name) { skipped++; continue; }
    txns.push({ date, description: name, amount: Math.round(amt * 100) / 100 });
  }
  return finish(txns, 'QIF', skipped, [], []);
}

function finish(txns: Txn[], format: string, skipped: number, warnings: string[], notes: string[]): ParseReport {
  if (skipped) warnings.push(`Skipped ${skipped} row${skipped === 1 ? '' : 's'} with a missing date, amount or description.`);
  txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { txns, format, skipped, warnings, notes };
}

/** No header row (HSBC): work out which column is the date, the amount and the description from the values. */
function inferColumns(rows: string[][], dc: boolean) {
  const sample = rows.slice(0, 40);
  const ncol = Math.max(...sample.map(r => r.length));
  const share = (i: number, ok: (s: string) => boolean) => sample.filter(r => ok(clean(r[i]))).length / sample.length;
  const cols = [...Array(ncol).keys()];
  const iDate = cols.find(i => share(i, s => parseDate(s) != null) > 0.8) ?? -1;
  const iAmount = cols.find(i => i !== iDate && share(i, s => parseAmount(s, dc) != null) > 0.8) ?? -1;
  const textLen = (i: number) => sample.reduce((a, r) => a + (parseAmount(clean(r[i]), dc) == null && parseDate(clean(r[i])) == null ? clean(r[i]).length : 0), 0);
  const iDesc = cols.filter(i => i !== iDate && i !== iAmount).sort((a, b) => textLen(b) - textLen(a))[0] ?? -1;
  return { iDate, iAmount, iDesc };
}

/** Any text statement: the Santander block format, or a delimited file (CSV, semicolons, tabs). */
export function parseBankCsv(text: string): ParseReport {
  if (isBlockFormat(text)) return parseBlocks(text);
  const delim = sniffDelimiter(text);
  const rows = splitCsv(text, delim);
  const warnings: string[] = [], notes: string[] = [];
  if (rows.length === 0) return { txns: [], format: 'empty', skipped: 0, warnings: ['The file is empty.'], notes };
  const dc = delim === ';';

  // Some exports (Nationwide) put account info above the real header. Find the first row with a date-like header.
  let h = rows.slice(0, 30).findIndex(r => r.some(c => HEADER_DATE.test(clean(c))));
  let headerless = false;
  if (h < 0) {
    // HSBC exports have no header at all: the first row is already a payment.
    headerless = rows[0].some(c => parseDate(clean(c)) != null) && rows[0].some(c => parseAmount(clean(c), dc) != null);
    h = headerless ? -1 : 0;
  }
  const headers = headerless ? [] : rows[h].map(c => clean(c).toLowerCase());
  const has = (re: RegExp) => headers.some(x => re.test(x));

  let iDate: number, iDesc: number, iAmount: number, iOut = -1, iIn = -1, iExtra = -1, iState = -1;
  if (headerless) ({ iDate, iAmount, iDesc } = inferColumns(rows, dc));
  else {
    iDate = find(headers, HEADER_DATE, /date/);
    // Lloyds/Halifax call it "Transaction Description", so a loose /description/ comes before /reference/.
    iDesc = find(headers, /^name$/, /counter ?party/, /^description$/, /^memo$/, /merchant/, /details/, /narrative/, /payee/, /description/, /reference/);
    iAmount = find(headers, /^amount( \(gbp\))?$/, /^amount/, /^value$/, /^(transaction )?amount/);
    iOut = find(headers, /paid out/, /money out/, /^debit/, /^out$/, /withdrawal/);
    iIn = find(headers, /paid in/, /money in/, /^credit/, /^in$/, /deposit/);
    iExtra = find(headers, /^description$/, /^memo$/, /reference/);
    iState = find(headers, /^state$/, /^status$/);
  }

  let format =
    headerless ? 'HSBC-style (no header row)' :
    has(/^emoji$/) ? 'Monzo' :
    has(/counter ?party/) ? 'Starling' :
    has(/^subcategory$/) ? 'Barclays' :
    has(/paid out/) ? 'Nationwide-style' :
    has(/transaction description/) ? 'Lloyds/Halifax' :
    has(/started date/) && iState >= 0 ? 'Revolut' :
    has(/card ?member|extended details/) ? 'Amex' :
    has(/^value$/) && has(/account name/) ? 'NatWest/RBS' :
    delim === ';' ? 'Semicolon-separated' : delim === '\t' ? 'Tab-separated' :
    'Generic';

  if (iDate < 0 || iDesc < 0 || (iAmount < 0 && iOut < 0)) {
    return { txns: [], format, skipped: Math.max(rows.length - 1, 0), warnings: ["Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount."], notes };
  }

  const txns: Txn[] = [];
  let skipped = 0, notReal = 0;
  for (const r of rows.slice(h + 1)) {
    if (iState >= 0 && NOT_REAL.test(r[iState] ?? '')) { notReal++; continue; }
    const date = parseDate(clean(r[iDate]));
    let amount: number | null = null;
    if (iAmount >= 0) amount = parseAmount(r[iAmount], dc);
    if (amount == null && iOut >= 0) {
      const out = parseAmount(r[iOut], dc), inn = iIn >= 0 ? parseAmount(r[iIn], dc) : null;
      if (out != null && out !== 0) amount = -Math.abs(out);
      else if (inn != null) amount = Math.abs(inn);
    }
    let description = clean(r[iDesc]);
    // Monzo "Name" can be blank for transfers; fall back to Description/Reference.
    if (!description && iExtra >= 0 && iExtra !== iDesc) description = clean(r[iExtra]);
    if (!date || amount == null || !description) { skipped++; continue; }
    txns.push({ date, description, amount: Math.round(amount * 100) / 100 });
  }
  if (notReal) notes.push(`Left out ${notReal} declined or reverted payment${notReal === 1 ? '' : 's'}. That money never left the account.`);

  // Credit card exports (Amex, Barclaycard) show charges as positive and the repayment as negative.
  // Flip only when the positives are clearly shop and subscription names, not wages or transfers.
  if (iAmount >= 0 && iOut < 0 && txns.length >= 5) {
    const pos = txns.filter(t => t.amount > 0);
    const merchants = pos.filter(t => { const m = resolveMerchant(t.description); return m.source !== 'unknown' && ['subscription', 'bill', 'spending'].includes(m.kind); });
    const repaid = txns.some(t => t.amount < 0 && CARD_REPAYMENT.test(t.description));
    if (format === 'Amex' || (pos.length / txns.length > 0.6 && merchants.length / Math.max(pos.length, 1) >= 0.5 && (repaid || pos.length === txns.length))) {
      for (const t of txns) t.amount = -t.amount;
      if (format === 'Generic') format = 'Credit card';
      notes.push('Read as a credit card statement: charges are shown as positive amounts, so they were counted as money out.');
    }
  }
  return finish(txns, format, skipped, warnings, notes);
}
