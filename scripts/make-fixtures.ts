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
console.log('fixtures written to', dir);
