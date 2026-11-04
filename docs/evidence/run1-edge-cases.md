# Edge-case upload test (run1)

Run 2026-11-03T19:35:51.943Z · 6/7 passed · page errors: none

| File | What should happen | Result | Time |
|---|---|---|---|
| 01-empty.csv | says the file is empty | pass | 1810 ms |
| 02-not-a-statement.csv | explains which columns it needs | pass | 321 ms |
| 03-barclays.csv | Barclays detected, Spotify + Netflix found, Sainsbury’s left out | pass | 331 ms |
| 04-lloyds.csv | Disney+ found, EE as a bill, salary ignored | **FAIL** | 342 ms |
| 05-messy-quotes-bom.csv | YouTube Premium found, mortgage as a fixed cost, 2 bad rows skipped | pass | 341 ms |
| 06-only-income.csv | 0 subscriptions, calm "nothing looks off" | pass | 332 ms |
| 07-five-years.csv | 5 years (~3,900 rows) in under 2 s, Netflix price rise found, coffee and TfL ignored | pass | 344 ms |
