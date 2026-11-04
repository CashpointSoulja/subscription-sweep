# Real-bank layouts: first run, before any fix (4 Nov 2026)

Each file read exactly the way the browser opened files before the fix (UTF-8 text). Raw output:

```
01-empty.csv                         empty            rows=    0 skipped=0 subs=[] bills=[] flags=[] 1ms The file is empty.
02-not-a-statement.csv               Generic          rows=    0 skipped=2 subs=[] bills=[] flags=[] 0ms Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
03-barclays.csv                      Barclays         rows=   39 skipped=0 subs=[Netflix £12.99, Spotify £11.99] bills=[] flags=[] 5ms 
04-lloyds.csv                        Lloyds/Halifax   rows=   18 skipped=0 subs=[Disney+ £7.99] bills=[EE] flags=[] 1ms 
05-messy-quotes-bom.csv              Generic          rows=   20 skipped=2 subs=[YouTube Premium £12.99] bills=[] flags=[] 1ms Skipped 2 rows with a missing date, amount or description.
06-only-income.csv                   Generic          rows=   10 skipped=0 subs=[] bills=[] flags=[] 0ms 
07-five-years.csv                    Generic          rows= 3892 skipped=0 subs=[PureGym £24.99, Netflix £12.99, Spotify £11.99] bills=[] flags=[price-rise] 47ms 
08-hsbc-no-header.csv                Generic          rows=    0 skipped=38 subs=[] bills=[] flags=[] 0ms Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
09-nationwide-windows-encoding.csv   Nationwide-style rows=    0 skipped=18 subs=[] bills=[] flags=[] 1ms Skipped 18 rows with a missing date, amount or description.
10-amex-credit-card.csv              Generic          rows=   41 skipped=0 subs=[Received Thank You £350] bills=[] flags=[unknown] 20ms 
11-revolut.csv                       Generic          rows=   20 skipped=0 subs=[Spotify £11.99, Disney+ £7.99] bills=[] flags=[double-charge,double-charge] 1ms 
12-natwest.csv                       Generic          rows=   12 skipped=0 subs=[Amazon Prime £8.99] bills=[Sky] flags=[] 1ms 
13-santander.txt                     Generic          rows=    0 skipped=49 subs=[] bills=[] flags=[] 0ms Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
14-one-month.csv                     Generic          rows=    4 skipped=0 subs=[] bills=[] flags=[] 0ms 
15-semicolons.csv                    Generic          rows=    0 skipped=12 subs=[] bills=[] flags=[] 0ms Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
16-statement.pdf                     Generic          rows=    0 skipped=2 subs=[] bills=[] flags=[] 0ms Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
17-statement.xlsx                    Generic          rows=    0 skipped=0 subs=[] bills=[] flags=[] 0ms Couldn't find date, description and amount columns. Expected headers like Date, Description, Amount.
```

**Score: 1 of 8 real-bank layouts right (NatWest).** HSBC, Nationwide, Santander and semicolon files read 0 payments. Amex listed the card repayment as a subscription and missed the three real ones. Revolut counted declined and reverted payments as double charges. A one-month file would say "Nothing looks off". PDF and Excel got a generic columns message.
