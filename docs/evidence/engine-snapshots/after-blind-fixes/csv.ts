import { parseDate } from './dates';
import type { Txn } from './types';

/** RFC-4180-ish CSV split: handles quotes, escaped quotes, commas and newlines inside quotes, BOM, CRLF. */
export function splitCsv(text: string): string[][] {
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
    else if (c === ',') { row.push(cell); cell = ''; }
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

/** "£1,240.00" → 1240, "(12.50)" → -12.5, "12.50 DR" → -12.5, "" → null */
export function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/[£$€\s]/g, '').replace(/,/g, '');
  if (!s) return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
  if (/DR$/i.test(s)) { sign = -1; s = s.replace(/DR$/i, ''); }
  if (/CR$/i.test(s)) s = s.replace(/CR$/i, '');
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
  warnings: string[];
}

/**
 * Reads a bank CSV export. Detects columns by header name, so it works for Monzo, Starling,
 * Barclays, Nationwide, HSBC-style and simple 3-column files.
 */
export function parseBankCsv(text: string): ParseReport {
  const rows = splitCsv(text);
  const warnings: string[] = [];
  if (rows.length === 0) return { txns: [], format: 'empty', skipped: 0, warnings: ['The file is empty.'] };

  // Some exports (Nationwide) put account info above the real header. Find the first row with a date-like header.
  let h = rows.findIndex(r => r.some(c => /^\s*(transaction\s*)?date\s*$/i.test(c)));
  if (h < 0) h = 0;
  const headers = rows[h].map(c => c.trim().toLowerCase());

  const iDate = find(headers, /^(transaction )?date$/, /date/);
  // Lloyds/Halifax call it "Transaction Description", so a loose /description/ comes before /reference/.
  const iDesc = find(headers, /^name$/, /counter ?party/, /^description$/, /^memo$/, /merchant/, /details/, /narrative/, /payee/, /description/, /reference/);
  const iAmount = find(headers, /^amount( \(gbp\))?$/, /^amount/, /^value$/);
  const iOut = find(headers, /paid out/, /money out/, /^debit/, /^out$/, /withdrawal/);
  const iIn = find(headers, /paid in/, /money in/, /^credit/, /^in$/, /deposit/);
  const iExtra = find(headers, /^description$/, /^memo$/, /reference/);

  const format =
    headers.includes('emoji') ? 'Monzo' :
    headers.some(x => /counter ?party/.test(x)) ? 'Starling' :
    headers.includes('subcategory') ? 'Barclays' :
    headers.some(x => /paid out/.test(x)) ? 'Nationwide-style' :
    'Generic';

  if (iDate < 0 || iDesc < 0 || (iAmount < 0 && iOut < 0)) {
    return { txns: [], format, skipped: rows.length - 1, warnings: ["Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount."] };
  }

  const txns: Txn[] = [];
  let skipped = 0;
  for (const r of rows.slice(h + 1)) {
    const date = parseDate(r[iDate] ?? '');
    let amount: number | null = null;
    if (iAmount >= 0) amount = parseAmount(r[iAmount]);
    if (amount == null && iOut >= 0) {
      const out = parseAmount(r[iOut]), inn = iIn >= 0 ? parseAmount(r[iIn]) : null;
      if (out != null && out !== 0) amount = -Math.abs(out);
      else if (inn != null) amount = Math.abs(inn);
    }
    let description = (r[iDesc] ?? '').trim();
    // Monzo "Name" can be blank for transfers; fall back to Description/Reference.
    if (!description && iExtra >= 0 && iExtra !== iDesc) description = (r[iExtra] ?? '').trim();
    if (!date || amount == null || !description) { skipped++; continue; }
    txns.push({ date, description, amount: Math.round(amount * 100) / 100 });
  }
  if (skipped) warnings.push(`Skipped ${skipped} row${skipped === 1 ? '' : 's'} with a missing date, amount or description.`);
  txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { txns, format, skipped, warnings };
}
