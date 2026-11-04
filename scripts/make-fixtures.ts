/** Edge-case upload files for the recorded browser test. Run: npx tsx scripts/make-fixtures.ts */
import { mkdirSync, writeFileSync } from 'node:fs';
import { addDays, addMonths } from '../src/engine/dates';

const dir = 'tests/fixtures';
mkdirSync(dir, { recursive: true });
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const months = (from: string, n: number) => Array.from({ length: n }, (_, i) => addMonths(from, i));

// 1. Empty file
writeFileSync(`${dir}/01-empty.csv`, '');

// 2. Not a bank statement at all
writeFileSync(`${dir}/02-not-a-statement.csv`, 'Name,Email,Signed up\nSam,sam@example.com,2026-01-04\nAlex,alex@example.com,2026-02-11\n');

// 3. Barclays layout: Number,Date,Account,Amount,Subcategory,Memo
{
  const rows = ['Number,Date,Account,Amount,Subcategory,Memo'];
  for (const d of months('2026-05-14', 6)) rows.push(`,${dmy(d)},20-32-06 13152170,-11.99,Debit,SPOTIFY UK          ON 14 MAY  CPM`);
  for (const d of months('2026-05-09', 6)) rows.push(`,${dmy(d)},20-32-06 13152170,-12.99,Debit,NETFLIX.COM          ON 09 MAY  CPM`);
  for (let d = '2026-05-02'; d < '2026-11-01'; d = addDays(d, 7)) rows.push(`,${dmy(d)},20-32-06 13152170,-${(40 + (+d.slice(8)) % 30).toFixed(2)},Debit,SAINSBURYS S/MKT     ON ${d.slice(8)}   BCC`);
  writeFileSync(`${dir}/03-barclays.csv`, rows.join('\n'));
}

// 4. Lloyds layout: separate Debit Amount / Credit Amount, "Transaction Description"
{
  const rows = ['Transaction Date,Transaction Type,Sort Code,Account Number,Transaction Description,Debit Amount,Credit Amount,Balance'];
  for (const d of months('2026-05-03', 6)) rows.push(`${dmy(d)},DEB,'30-94-12,12345678,DISNEY PLUS,7.99,,1200.00`);
  for (const d of months('2026-05-21', 6)) rows.push(`${dmy(d)},DD,'30-94-12,12345678,EE LIMITED,24.00,,1180.00`);
  for (const d of months('2026-05-28', 6)) rows.push(`${dmy(d)},BGC,'30-94-12,12345678,EMPLOYER LTD SALARY,,2100.00,3280.00`);
  writeFileSync(`${dir}/04-lloyds.csv`, rows.join('\n'));
}

// 5. Messy: BOM, Windows line endings, quoted commas, £ signs, thousands, a blank line, a bad row
{
  const rows = ['﻿Date,Description,Amount'];
  for (const d of months('2026-01-12', 10)) rows.push(`${dmy(d)},"GOOGLE *YOUTUBEPREMIUM, LONDON","-£12.99"`);
  for (const d of months('2026-01-01', 10)) rows.push(`${dmy(d)},"NATIONWIDE MORTGAGE","-£1,240.00"`);
  rows.push('', 'not a date,SOMETHING,-1.00', `${dmy('2026-03-03')},"",-4.00`);
  writeFileSync(`${dir}/05-messy-quotes-bom.csv`, rows.join('\r\n'));
}

// 6. Only income: nothing to find
writeFileSync(`${dir}/06-only-income.csv`, ['Date,Description,Amount', ...months('2026-01-28', 10).map(d => `${dmy(d)},ACME LTD SALARY,2450.00`)].join('\n'));

// 7. Five years, ~11,000 rows: speed check
{
  const rows = ['Date,Description,Amount'];
  for (let d = '2021-11-01'; d <= '2026-10-31'; d = addDays(d, 1)) {
    rows.push(`${dmy(d)},PRET A MANGER,-3.40`, `${dmy(d)},TFL TRAVEL CH,-2.80`);
    if (d.endsWith('-01')) rows.push(`${dmy(d)},PUREGYM LTD,-24.99`, `${dmy(d)},NETFLIX.COM,-${d < '2024-01-01' ? '10.99' : '12.99'}`);
    if (d.endsWith('-15')) rows.push(`${dmy(d)},SPOTIFY,-11.99`, `${dmy(d)},TESCO STORES,-${(30 + (+d.slice(5, 7)) * 3).toFixed(2)}`);
  }
  writeFileSync(`${dir}/07-five-years.csv`, rows.join('\n'));
}

// ── Real-bank layouts (added 4 Nov). Each is a layout a UK bank actually exports, with the awkward bits kept. ──

// 8. HSBC-style: no header row at all, HSBC prefixes (VIS, DD, ")))" for contactless)
{
  const rows: string[] = [];
  for (const d of months('2026-05-06', 6)) rows.push(`${dmy(d)},"VIS NETFLIX.COM 866-579-7172",-12.99`);
  for (const d of months('2026-05-01', 6)) rows.push(`${dmy(d)},"DD PUREGYM LTD",-24.99`);
  for (let d = '2026-05-02'; d < '2026-11-01'; d = addDays(d, 9)) rows.push(`${dmy(d)},"))) TESCO STORES 3051",-${(18 + (+d.slice(8)) % 25).toFixed(2)}`);
  for (const d of months('2026-05-28', 6)) rows.push(`${dmy(d)},"CR ACME LTD SALARY",2450.00`);
  writeFileSync(`${dir}/08-hsbc-no-header.csv`, rows.join('\n'));
}

// 9. Nationwide-style: account info above the header, £ in every amount, saved in the old Windows encoding (£ = byte 0xA3)
{
  const rows = ['"Account Name:","FlexDirect ****12345"', '"Account Balance:","£1,234.56"', '"Available Balance: ","£1,234.56"', '', '"Date","Transaction type","Description","Paid out","Paid in","Balance"'];
  for (const d of months('2026-05-11', 6)) rows.push(`"${fmtLong(d)}","Contactless Payment","SPOTIFY","£11.99","","£1,200.00"`);
  for (const d of months('2026-05-19', 6)) rows.push(`"${fmtLong(d)}","Direct debit","VODAFONE LTD","£22.00","","£1,180.00"`);
  for (const d of months('2026-05-25', 6)) rows.push(`"${fmtLong(d)}","Bank credit","ACME LTD","","£2,450.00","£3,630.00"`);
  writeFileSync(`${dir}/09-nationwide-windows-encoding.csv`, Buffer.from(rows.join('\r\n'), 'latin1'));
}

// 10. Amex-style credit card: charges are POSITIVE, the card repayment is negative
{
  const rows = ['Date,Description,Amount'];
  for (const d of months('2026-05-04', 6)) rows.push(`${dmy(d)},AUDIBLE UK          ADBL.CO/PYMT,7.99`);
  for (const d of months('2026-05-08', 6)) rows.push(`${dmy(d)},ADOBE  *CREATIVE CLD   DUBLIN,19.97`);
  for (const d of months('2026-05-13', 6)) rows.push(`${dmy(d)},NETFLIX.COM         AMSTERDAM,12.99`);
  for (let d = '2026-05-03'; d < '2026-11-01'; d = addDays(d, 11)) rows.push(`${dmy(d)},WAITROSE 0712       LONDON,${(30 + (+d.slice(8)) % 40).toFixed(2)}`);
  for (const d of months('2026-05-20', 6)) rows.push(`${dmy(d)},PAYMENT RECEIVED - THANK YOU,-350.00`);
  writeFileSync(`${dir}/10-amex-credit-card.csv`, rows.join('\n'));
}

// 11. Revolut-style: ISO date-times, a State column. DECLINED and REVERTED rows never left the account
{
  const rows = ['Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance'];
  for (const d of months('2026-05-07', 6)) rows.push(`CARD_PAYMENT,Current,${d} 08:14:02,${d} 09:01:44,Spotify,-11.99,0.00,GBP,COMPLETED,500.00`);
  for (const d of months('2026-05-15', 6)) rows.push(`CARD_PAYMENT,Current,${d} 19:40:10,${d} 20:02:31,Disney Plus,-7.99,0.00,GBP,COMPLETED,480.00`);
  rows.push(`CARD_PAYMENT,Current,2026-09-15 19:41:00,,Disney Plus,-7.99,0.00,GBP,DECLINED,480.00`);
  rows.push(`CARD_PAYMENT,Current,2026-08-07 08:20:00,2026-08-08 10:00:00,Spotify,-11.99,0.00,GBP,REVERTED,488.01`);
  for (const d of months('2026-05-01', 6)) rows.push(`TOPUP,Current,${d} 07:00:00,${d} 07:00:05,Top-Up by *4821,300.00,0.00,GBP,COMPLETED,800.00`);
  writeFileSync(`${dir}/11-revolut.csv`, rows.join('\n'));
}

// 12. NatWest-style: blank first line, "Value" for the amount, Excel apostrophes on text
{
  const rows = ['', 'Date, Type, Description, Value, Balance, Account Name, Account Number'];
  for (const d of months('2026-05-02', 6)) rows.push(`${dmy(d)},D/D,"'SKY DIGITAL",-35.00,1500.00,"'A AHMED","'601234-12345678"`);
  for (const d of months('2026-05-16', 6)) rows.push(`${dmy(d)},POS,"'1234 15MAY26 AMAZON PRIME*2K4 AMZN.CO.UK/PM GB",-8.99,1490.00,"'A AHMED","'601234-12345678"`);
  writeFileSync(`${dir}/12-natwest.csv`, rows.join('\n'));
}

// 13. Santander-style text download: one block per payment, not a CSV at all
{
  const rows = ['From: 01/05/2026 to 31/10/2026', '', 'Account: XXXX XXXX XXXX 4321', ''];
  const block = (d: string, desc: string, amt: string) => rows.push(`Date: ${dmy(d)}`, `Description: ${desc}`, `Amount: ${amt} `, `Balance: 1000.00 `, '');
  for (const d of months('2026-05-09', 6)) block(d, 'CARD PAYMENT TO NOW TV,9.99 GBP, RATE 1.00/GBP ON ' + d.split('-').reverse().join('-'), '-9.99');
  for (const d of months('2026-05-21', 6)) block(d, 'DIRECT DEBIT PAYMENT TO OCTOPUS ENERGY REF 0012345, MANDATE NO 0042', '-96.00');
  writeFileSync(`${dir}/13-santander.txt`, Buffer.from(rows.join('\r\n'), 'latin1'));
}

// 14. Only one month: too short to see anything repeat
{
  const rows = ['Date,Description,Amount'];
  rows.push(`${dmy('2026-10-03')},NETFLIX.COM,-12.99`, `${dmy('2026-10-11')},SPOTIFY,-11.99`, `${dmy('2026-10-15')},TESCO STORES,-42.10`, `${dmy('2026-10-28')},ACME LTD SALARY,2450.00`);
  writeFileSync(`${dir}/14-one-month.csv`, rows.join('\n'));
}

// 15. Semicolons instead of commas
{
  const rows = ['Date;Description;Amount'];
  for (const d of months('2026-05-12', 6)) rows.push(`${dmy(d)};APPLE.COM/BILL;-2.99`);
  for (const d of months('2026-05-22', 6)) rows.push(`${dmy(d)};DEEZER;-11.99`);
  writeFileSync(`${dir}/15-semicolons.csv`, rows.join('\n'));
}

// 16 + 17. Wrong kind of file: a PDF statement and an Excel spreadsheet
writeFileSync(`${dir}/16-statement.pdf`, '%PDF-1.4\n%âãÏÓ\n1 0 obj << /Type /Catalog >> endobj\n');
writeFileSync(`${dir}/17-statement.xlsx`, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]));

function fmtLong(iso: string) { return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }

console.log('fixtures written to', dir);
