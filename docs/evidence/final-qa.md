# Browser QA run (final)

Run 2026-11-04T15:20:32.211Z against http://127.0.0.1:5289/ · **89/89 checks passed**

| Area | Check | Result | Detail |
|---|---|---|---|
| stability | Layout shift while the page loads (CLS) | pass | 0.0001 |
| stability | → The Okafors: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → The Okafors: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → The Okafors: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → The Okafors: highlight pill sits on the current tab | pass |  |
| stability | → Tom: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → Tom: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → Tom: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → Tom: highlight pill sits on the current tab | pass |  |
| stability | → Your file: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → Your file: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → Your file: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → Your file: highlight pill sits on the current tab | pass |  |
| stability | → Priya: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → Priya: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → Priya: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → Priya: highlight pill sits on the current tab | pass |  |
| stability | → Tom: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → Tom: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → Tom: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → Tom: highlight pill sits on the current tab | pass |  |
| stability | → The Okafors: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → The Okafors: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → The Okafors: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → The Okafors: highlight pill sits on the current tab | pass |  |
| stability | → Priya: household bar didn't move (during and after) | pass | [152,68,301.3,42] |
| stability | → Priya: nav, title position, page width and scroll unchanged | pass | title y 150→150, width 1440→1440, scroll 0→0 |
| stability | → Priya: nothing moved later than 0.7 s after the click | pass | 0 late shifts |
| stability | → Priya: highlight pill sits on the current tab | pass |  |
| stability | Switching while scrolled down: bar stays pinned, page glides back to the top | pass | bar y 60, scroll 0 |
| interactions | Flag card opens to show the payments behind it | pass | height 206px |
| interactions | Flag card closes again | pass | height 0px |
| interactions | Table sorts by name | pass | apple, apple, disney+, headspace |
| interactions | Table sorts by price, highest first | pass | 49.99, 24.99, 24.99, 16 |
| interactions | Hovering a chart bar shows that month | pass |  |
| interactions | Right arrow on the household bar moves to the next household, focus follows | pass |  |
| interactions | Browser Back returns to the previous household | pass |  |
| interactions | Deep link #/sweep/tom shows the right page and tab title | pass | Tom's sweep · Subscription Sweep |
| interactions | Deep link #/sweep/nobody shows the right page and tab title | pass | Not found · Subscription Sweep |
| interactions | Deep link #/nope shows the right page and tab title | pass | Not found · Subscription Sweep |
| interactions | Deep link #/how shows the right page and tab title | pass | How it works · Subscription Sweep |
| interactions | Deep link #/docs/PRD shows the right page and tab title | pass | PRD · Subscription Sweep |
| interactions | First Tab press focuses "Skip to content" | pass |  |
| uploads | 01-empty.csv: says the file is empty, never "nothing looks off" | pass | 1426 ms, reading animation shown |
| uploads | 02-not-a-statement.csv: explains which columns it needs | pass | 1425 ms, reading animation shown |
| uploads | 03-barclays.csv: Barclays: Spotify and Netflix | pass | 1413 ms, reading animation shown |
| uploads | 04-lloyds.csv: Lloyds: Disney+, EE as a bill | pass | 1412 ms, reading animation shown |
| uploads | 05-messy-quotes-bom.csv: messy file: YouTube Premium, mortgage, 2 rows skipped | pass | 1414 ms, reading animation shown |
| uploads | 06-only-income.csv: income only: calm "nothing looks off" | pass | 1414 ms, reading animation shown |
| uploads | 07-five-years.csv: five years: Netflix price rise | pass | 1417 ms, reading animation shown |
| uploads | 08-hsbc-no-header.csv: HSBC, no header row: PureGym and Netflix | pass | 1415 ms, reading animation shown |
| uploads | 09-nationwide-windows-encoding.csv: Nationwide old encoding: Spotify, Vodafone | pass | 1418 ms, reading animation shown |
| uploads | 10-amex-credit-card.csv: Amex: charges read as money out, repayment ignored | pass | 1416 ms, reading animation shown |
| uploads | 11-revolut.csv: Revolut: declined payments left out | pass | 1413 ms, reading animation shown |
| uploads | 12-natwest.csv: NatWest: Sky and Amazon Prime | pass | 1414 ms, reading animation shown |
| uploads | 13-santander.txt: Santander text file: NOW and Octopus | pass | 1413 ms, reading animation shown |
| uploads | 14-one-month.csv: one month: "too short" warning, not "nothing looks off" | pass | 1423 ms, reading animation shown |
| uploads | 15-semicolons.csv: semicolons: Deezer | pass | 1415 ms, reading animation shown |
| uploads | 16-statement.pdf: PDF: says how to get the CSV | pass | 1413 ms, reading animation shown |
| uploads | 17-statement.xlsx: Excel: says to save as CSV | pass | 1412 ms, reading animation shown |
| uploads | Two files at once (current account + credit card) are merged | pass |  |
| uploads | The same file twice counts each payment once (no fake "charged twice") | pass |  |
| uploads | "Add another file" adds to what is already there | pass |  |
| uploads | "Start over" clears everything | pass |  |
| uploads | Picking the same file again after starting over still works | pass |  |
| uploads | 100,000-payment file: finishes, and the page never freezes for long | pass | 1419 ms total, longest freeze 0 ms |
| uploads | A file over 25MB gets a clear message | pass |  |
| uploads | Drag a file anywhere on the home page: overlay shows, drop sweeps it | pass |  |
| phone | → The Okafors: bar fixed, nothing moved late, no sideways scroll | pass |  |
| phone | → Tom: bar fixed, nothing moved late, no sideways scroll | pass |  |
| phone | → Your file: bar fixed, nothing moved late, no sideways scroll | pass |  |
| phone | → Priya: bar fixed, nothing moved late, no sideways scroll | pass |  |
| phone | Top bar fits on one line | pass |  |
| phone | Tap a flag card to open it, no sideways scroll | pass |  |
| phone | A very long file name never makes the page scroll sideways | pass | 0px |
| phone | /: no sideways scroll | pass |  |
| phone | /how: no sideways scroll | pass |  |
| phone | /accuracy: no sideways scroll | pass |  |
| phone | /docs/build-log: no sideways scroll | pass |  |
| phone | /sweep/yours: no sideways scroll | pass |  |
| reduced motion | Less-motion setting: message and numbers appear at once, no animation | pass | {"bubbles":3,"shown":3,"value":"£263"} |
| reduced motion | Less-motion setting: upload result appears without the wait | pass |  |
| accessibility | /: no serious or critical issues | pass |  |
| accessibility | /sweep/priya: no serious or critical issues | pass |  |
| accessibility | /sweep/yours: no serious or critical issues | pass |  |
| accessibility | /how: no serious or critical issues | pass |  |
| accessibility | /accuracy: no serious or critical issues | pass |  |
| accessibility | /docs/memo: no serious or critical issues | pass |  |
| errors | No page errors or console errors anywhere in the run | pass |  |
