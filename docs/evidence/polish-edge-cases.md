# Edge-case upload test (polish)

Run 2026-11-04T14:57:13.994Z · 7/7 passed · page errors: none

| File | What should happen | Result | Time |
|---|---|---|---|
| 01-empty.csv | says the file is empty, never "nothing looks off" | pass | 343 ms |
| 02-not-a-statement.csv | explains which columns it needs, shows no £0 result | pass | 311 ms |
| 03-barclays.csv | Barclays detected, Spotify + Netflix found, Sainsbury’s left out | pass | 305 ms |
| 04-lloyds.csv | Disney+ found, EE as a bill, salary ignored | pass | 306 ms |
| 05-messy-quotes-bom.csv | YouTube Premium found, mortgage as a fixed cost, 2 bad rows skipped | pass | 310 ms |
| 06-only-income.csv | 0 subscriptions, calm "nothing looks off" | pass | 305 ms |
| 07-five-years.csv | 5 years (~3,900 rows) in under 2 s, Netflix price rise found, coffee and TfL ignored | pass | 306 ms |
