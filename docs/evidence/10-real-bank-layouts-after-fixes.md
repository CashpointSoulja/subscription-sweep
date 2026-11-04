# Real-bank layouts: after the fixes (4 Nov 2026)

Same files as `09-real-bank-layouts-first-run.md`, read the way the browser reads them now: bytes in, file type and text encoding detected first (`src/engine/files.ts`), then the reader (`src/engine/csv.ts`). Raw output:

```
01-empty.csv                         empty                      rows=    0 skipped=0 days=1 subs=[] bills=[] fixed=[] flags=[] 1ms
    warnings: The file is empty.
02-not-a-statement.csv               Generic                    rows=    0 skipped=2 days=1 subs=[] bills=[] fixed=[] flags=[] 1ms
    warnings: Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
03-barclays.csv                      Barclays                   rows=   39 skipped=0 days=183 subs=[Netflix £12.99, Spotify £11.99] bills=[] fixed=[] flags=[] 5ms
04-lloyds.csv                        Lloyds/Halifax             rows=   18 skipped=0 days=179 subs=[Disney+ £7.99] bills=[EE] fixed=[] flags=[] 1ms
05-messy-quotes-bom.csv              Generic                    rows=   20 skipped=2 days=285 subs=[YouTube Premium £12.99] bills=[] fixed=[Mortgage] flags=[] 1ms
    warnings: Skipped 2 rows with a missing date, amount or description.
06-only-income.csv                   Generic                    rows=   10 skipped=0 days=274 subs=[] bills=[] fixed=[] flags=[] 1ms
07-five-years.csv                    Generic                    rows= 3892 skipped=0 days=1826 subs=[PureGym £24.99, Netflix £12.99, Spotify £11.99] bills=[] fixed=[] flags=[price-rise] 54ms
08-hsbc-no-header.csv                HSBC-style (no header row) rows=   39 skipped=0 days=182 subs=[PureGym £24.99, Netflix £12.99] bills=[] fixed=[] flags=[] 1ms
09-nationwide-windows-encoding.csv   Nationwide-style           rows=   18 skipped=0 days=168 subs=[Spotify £11.99] bills=[Vodafone] fixed=[] flags=[] 2ms
    notes: Read as Windows-1252 text, an older format some banks still use.
10-amex-credit-card.csv              Credit card                rows=   41 skipped=0 days=177 subs=[Adobe £19.97, Netflix £12.99, Audible £7.99] bills=[] fixed=[] flags=[] 1ms
    notes: Read as a credit card statement: charges are shown as positive amounts, so they were counted as money out.
11-revolut.csv                       Revolut                    rows=   18 skipped=0 days=168 subs=[Spotify £11.99, Disney+ £7.99] bills=[] fixed=[] flags=[] 1ms
    notes: Left out 2 declined or reverted payments. That money never left the account.
12-natwest.csv                       NatWest/RBS                rows=   12 skipped=0 days=168 subs=[Amazon Prime £8.99] bills=[Sky] fixed=[] flags=[] 1ms
13-santander.txt                     Santander text file        rows=   12 skipped=0 days=166 subs=[NOW £9.99] bills=[Octopus Energy] fixed=[] flags=[] 1ms
    notes: Read as Windows-1252 text, an older format some banks still use.
14-one-month.csv                     Generic                    rows=    4 skipped=0 days=26 subs=[] bills=[] fixed=[] flags=[] 0ms
15-semicolons.csv                    Semicolon-separated        rows=   12 skipped=0 days=164 subs=[Deezer £11.99, Apple £2.99] bills=[] fixed=[] flags=[] 0ms
16-statement.pdf                     PDF                        rows=    0 skipped=0 days=1 subs=[] bills=[] fixed=[] flags=[] 0ms
    warnings: That's a PDF statement. Sweep reads the CSV download instead. In your banking app or online banking, look for Export or Download transactions and choose CSV.
17-statement.xlsx                    Spreadsheet                rows=    0 skipped=0 days=1 subs=[] bills=[] fixed=[] flags=[] 0ms
    warnings: That's a spreadsheet (Excel or Numbers). Open it and save it as CSV, or download the CSV version from your bank.
```

**Score: 8 of 8 real-bank layouts right** (was 1 of 8). PDF and Excel get a message saying how to get the CSV. The one-month file reads, and the page and Nora both say it's too short to judge instead of "Nothing looks off". Not blind: I wrote these files and the fixes, so this proves the layouts are handled, not that every bank's real export matches them.
