import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AI_LABELS } from '../src/data';
import { composeMessage, decodeBytes, mergeStatements, periodPhrase, parseAmount, parseBankCsv, parseDate, readStatement, sniffDelimiter, sweep } from '../src/engine';

const fixture = (f: string) => readStatement(f, new Uint8Array(readFileSync(`tests/fixtures/${f}`)));
const subs = (f: string) => sweep(fixture(f).txns, { ai: AI_LABELS }).subscriptions.map(s => s.merchant.name).sort();
const enc = (s: string) => new TextEncoder().encode(s);

describe('real bank layouts', () => {
  it('HSBC: no header row, columns worked out from the values', () => {
    const r = fixture('08-hsbc-no-header.csv');
    expect(r.format).toMatch(/HSBC/);
    expect(r.txns.length).toBe(39);
    expect(subs('08-hsbc-no-header.csv')).toEqual(['Netflix', 'PureGym']);
  });
  it('Nationwide: old Windows encoding, £ in every amount', () => {
    const r = fixture('09-nationwide-windows-encoding.csv');
    expect(r.encoding).toBe('Windows-1252');
    expect(r.skipped).toBe(0);
    expect(r.txns.find(t => /SPOTIFY/.test(t.description))?.amount).toBe(-11.99);
  });
  it('Amex: positive charges are read as money out; the card repayment is not a subscription', () => {
    const r = fixture('10-amex-credit-card.csv');
    expect(r.notes.join()).toMatch(/credit card/);
    expect(subs('10-amex-credit-card.csv')).toEqual(['Adobe', 'Audible', 'Netflix']);
  });
  it('Revolut: declined and reverted payments are left out, so no false "charged twice"', () => {
    const r = fixture('11-revolut.csv');
    expect(r.format).toBe('Revolut');
    expect(r.notes.join()).toMatch(/Left out 2/);
    expect(sweep(r.txns, { ai: AI_LABELS }).flags.filter(f => f.type === 'double-charge')).toHaveLength(0);
  });
  it('NatWest: Excel apostrophes stripped', () => {
    expect(fixture('12-natwest.csv').txns[0].description).not.toMatch(/^'/);
  });
  it('Santander text download (Date:/Description:/Amount: blocks)', () => {
    const r = fixture('13-santander.txt');
    expect(r.format).toMatch(/Santander/);
    expect(r.txns).toHaveLength(12);
  });
  it('semicolon-separated files', () => {
    expect(sniffDelimiter('Date;Description;Amount\n01/10/2026;X;-1.00')).toBe(';');
    expect(fixture('15-semicolons.csv').txns).toHaveLength(12);
    expect(parseAmount('-1.240,50', true)).toBe(-1240.5);
  });
  it('a salary-only file is never flipped into "money out"', () => {
    expect(fixture('06-only-income.csv').txns.every(t => t.amount > 0)).toBe(true);
  });
});

describe('wrong kinds of file get a clear message, never a £0 result', () => {
  it.each([['16-statement.pdf', /PDF/], ['17-statement.xlsx', /spreadsheet/]])('%s', (f, re) => {
    const r = fixture(f);
    expect(r.fatal).toBe(true);
    expect(r.warnings[0]).toMatch(re);
  });
  it('a PNG is called a picture', () => {
    expect(readStatement('x.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])).warnings[0]).toMatch(/picture/);
  });
});

describe('encodings', () => {
  it('UTF-16 with a BOM', () => {
    const s = 'Date,Description,Amount\n01/10/2026,NETFLIX.COM,-12.99';
    const b = new Uint8Array(2 + s.length * 2); b[0] = 0xff; b[1] = 0xfe;
    for (let i = 0; i < s.length; i++) b[2 + i * 2] = s.charCodeAt(i);
    expect(decodeBytes(b).encoding).toBe('UTF-16');
    expect(readStatement('x.csv', b).txns[0].amount).toBe(-12.99);
  });
  it('UTF-8 stays UTF-8', () => expect(decodeBytes(enc('Date,£')).encoding).toBe('UTF-8'));
});

describe('OFX and QIF downloads', () => {
  it('OFX', () => {
    const ofx = 'OFXHEADER:100\n<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003120000<TRNAMT>-12.99<NAME>NETFLIX.COM</STMTTRN><STMTTRN><DTPOSTED>20261103<TRNAMT>-12.99<NAME>NETFLIX.COM</STMTTRN></BANKTRANLIST></OFX>';
    const r = readStatement('x.ofx', enc(ofx));
    expect(r.format).toBe('OFX');
    expect(r.txns).toEqual([{ date: '2026-10-03', description: 'NETFLIX.COM', amount: -12.99 }, { date: '2026-11-03', description: 'NETFLIX.COM', amount: -12.99 }]);
  });
  it('QIF, day-first dates', () => {
    const qif = '!Type:Bank\nD03/10/2026\nT-11.99\nPSPOTIFY\n^\nD03/11/2026\nT-11.99\nPSPOTIFY\n^\n';
    expect(readStatement('x.qif', enc(qif)).txns.map(t => t.date)).toEqual(['2026-10-03', '2026-11-03']);
  });
});

describe('several files at once', () => {
  it('the same file twice counts each payment once, but keeps a real double charge inside one file', () => {
    const a = parseBankCsv('Date,Description,Amount\n01/10/2026,NETFLIX.COM,-12.99\n01/10/2026,NETFLIX.COM,-12.99\n05/10/2026,SPOTIFY,-11.99');
    const m = mergeStatements([{ ...a, name: 'a' }, { ...a, name: 'b' }]);
    expect(m.txns).toHaveLength(3);
    expect(m.dupes).toBe(3);
  });
});

it('31-Oct-2026 dates', () => expect(parseDate('31-Oct-2026')).toBe('2026-10-31'));

describe("Nora's message on short and long files", () => {
  it('says the period in plain words', () => {
    expect(periodPhrase(26)).toBe('your last few weeks');
    expect(periodPhrase(31)).toBe('your last few weeks');
    expect(periodPhrase(50)).toBe('your last 2 months');
    expect(periodPhrase(365)).toBe('your last 12 months');
    expect(periodPhrase(1826)).toBe('your last 5 years');
  });
  it('a one-month file is never called "all clear"', () => {
    const r = sweep(fixture('14-one-month.csv').txns, { ai: AI_LABELS });
    const text = composeMessage(r, 'Sam').lines.join(' ');
    expect(text).not.toMatch(/Nothing looks off/);
    expect(text).toMatch(/too short/);
    expect(text).not.toMatch(/1 months/);
  });
});
