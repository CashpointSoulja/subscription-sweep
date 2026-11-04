# holdout2: second blind test set

Two synthetic UK households, 12 months each (01/11/2025 to 31/10/2026). Built without looking at the
detector (`src/engine`), the scripts (`scripts/`), the first holdout (`src/data/holdout`) or
`merchant-labels.json`. Only `answer-key.json` was opened, to copy the JSON shape.

**Don't tune the detector on these files.** Once you use them to fix something, they stop being a blind test.

| File | What it is |
|---|---|
| `holdout2-a.csv` | The Hendersons, Bristol. HSBC joint account. 657 rows, **newest first** (as HSBC exports) |
| `holdout2-b.csv` | Ellie & Jonah, Hove. Jonah's Santander and Ellie's Revolut merged into one file by a budgeting app. 628 rows, oldest first |
| `holdout2-key.json` | Answer key: 26 + 24 truth items, 8 + 7 expected flags, must-not lists |

Header is `Date,Description,Amount`, dates are DD/MM/YYYY, money out is negative, and descriptions containing commas are quoted.

## Household A: The Hendersons (HSBC)

Claire (NHS nurse) and Ravi (freelance designer), toddler at nursery, mortgage, one car.

| Trap | Where |
|---|---|
| HSBC prefixes: `VIS`, `DD`, `SO`, `BP`, `CR`, `)))` contactless, `ATM` | whole file |
| USD subscription with FX wobble: the descriptor changes every month (transaction ref and rate are embedded) and a separate `NON-STERLING TRANSACTION FEE` row follows each charge | Midjourney, $10 = £7.36 to £7.51 |
| Same fee rows also appear from a week's holiday in Spain (EUR card spends) | July 2026 |
| Monthly plan switched to annual: 5 × £19.97, then one charge of £238.42 | Adobe (`VIS ADOBE SYSTEMS SOFTWARE`) |
| Annual plan bought mid-period (only one charge in the file) | National Trust, £162 DD, 13/04/2026 |
| The same words "NATIONAL TRUST" used for café/shop spends at properties | `VIS NATIONAL TRUST TYNTESFIELD` / `LACOCK` |
| Family plan replaces an individual one at the same merchant, on the same descriptor. The last Individual charge (06/01) and first Duo charge (14/01) are 8 days apart | Spotify Individual £11.99 (cancelled), then Duo £16.99 |
| Billing day changes once: card expired, so there's a 43-day gap, then a new day | Netflix, 9th → 21st from June |
| Genuine duplicate: Ravi moved to Google One in March but kept paying Dropbox | Google One £7.99 + Dropbox £9.99 |
| Double charge that **was** refunded (shouldn't be flagged) | Google One 11/05 ×2, +£7.99 on 13/05 |
| Bill with two price rises in a year: April mid-contract rise, then the out-of-contract jump in July | BT £32.99 → £36.49 → £58.99 |
| Energy tariff change mid-year | EDF £138 → £151 from May |
| April mobile rise | O2 (`DD TELEFONICA UK LTD`) £26.00 → £28.50 |
| Car insurance monthly, **price drop** at renewal, with a one-off £92.80 first instalment | LV= £52.18 → (£92.80) → £46.40 |
| Water billed quarterly, with an April rise | `DD BRISTOL WESSEX BILLING` |
| Council tax in 10 instalments (none in Feb/Mar), with an April rise | `DD BRISTOL CITY COUNCIL` |
| Quarterly magazine DD under the publisher's name | `DD IMMEDIATE MEDIA CO` |
| Cancelled gym charges once more on an odd day, then stops | Nuffield: 1st of Nov–Feb, then 16/03, then nothing |
| Annual renewal falls within 30 days of period end | RAC breakdown (19/11) |
| New subscription in the last 45 days, which also makes a stack of 3 | Disney+ from 28/09 (with Netflix + Apple TV) |
| App Store one-offs on the same descriptor as Apple TV. A £1.99 charge on 20/08, 7 days before an Apple TV charge, looks like a trial but isn't | `VIS APPLE.COM/BILL` |
| Recurring payment nobody could name | `VIS CKO*MBRSHP SVCS 0330` £9.99 |
| Weekly cleaner by bank transfer, with skipped weeks and one double week (£96) | `BP M KOWALSKA CLEANING` |
| Childcare, monthly, varying amount | `BP LITTLE ACORNS NURSERY` |
| Savings ×2, car finance, credit card | `SO NS&I PREMIUM BONDS`, `SO MONEYBOX JISA`, `DD BLACK HORSE LTD`, `DD BARCLAYCARD` |
| Yoga class pack bought 5 times at irregular 7–10-week gaps, plus one drop-in | `VIS SUMUP *THE YOGA SHED` £85 |
| Every-4-weeks credits (not monthly) | `CR HMRC CHILD BENEFIT` |
| Fixed £2.00 bus fares, repeated | `))) FIRST BUS BRISTOL` |

## Household B: Ellie & Jonah (Santander + Revolut merged)

Jonah (developer, Santander) and Ellie (teacher, Revolut) rent a flat in Hove and have a dog.

| Trap | Where |
|---|---|
| Santander card style `CARD PAYMENT TO X,9.99 GBP, RATE 1.00/GBP ON dd-mm-yyyy`: commas inside the text, a different string every month, and the posting date (CSV `Date`) 1–5 days after the date in the text (5 over Easter) | all Jonah's card rows |
| Santander DD/SO style with `REF …, MANDATE NO …` | all Jonah's DDs |
| Revolut clean names (`Netflix`, `Spotify`, `Proton`) mixed into the same file | all Ellie's rows |
| USD subscription in Santander style (the rate is in the text) | Perplexity, $20 = £14.76 to £15.04 |
| EUR subscription, including Revolut's 1% weekend FX markup | Proton €4.99 = £4.25 to £4.34 |
| Annual plan bought mid-period, in EUR | Komoot €59.99 = £51.09, 14/05/2026 |
| Annual plan switched to monthly: £84.99 annual charge on 07/11, refunded, monthly £8.49 from the same day as the refund. A detector that misses the refund will predict a renewal on 07/11/2026 (false renewal-soon) | Microsoft 365 |
| Two adults each paying their own **different** streaming service (not a duplicate, and only 2, so no stack) | Ellie's Netflix £5.99, Jonah's Disney+ |
| Price **drop** at the same merchant (downgrade to the ad tier) | Disney+ £9.99 → £5.99 from March |
| Genuine duplicate: Jonah pays two AI assistants | ChatGPT Plus £20 + Perplexity (cheaper) |
| Subscription with two price rises (intro rate ends in Jan, annual review in April) | Freedom Leisure £32.00 → £36.50 → £38.90 |
| Renewal price rise on pet insurance | Petplan £38.72 → £46.10 from June |
| Energy tariff change is a **drop**, plus a refund credit in June | E.ON Next £104 → £89 |
| TV Licence paid quarterly; water and council tax monthly (12 instalments), all with April rises | DDs |
| Rent rise (housing, so no flag) | £1,650 → £1,720 from June |
| £1 trial converted to £10/month within 31 days, inside the last 90 days | The Telegraph |
| Charged twice in one cycle, no refund | Spotify 21/08 and 22/08 |
| Annual renewal within 30 days of period end | Nintendo Switch Online (26/11) |
| Weekly box with skipped weeks and add-on weeks (£46.48); cancelled with two weeks skipped, but one more box was charged on 23/07, then nothing | HelloFresh |
| Recurring payment nobody could name | `CARD PAYMENT TO TPR*SUBSCR 0845` £6.00 |
| Partner's monthly rent share between the couple's own accounts: it appears twice, as money out (Revolut) and money in (Santander) | `To Jonah Adeyemi` / `…RENT FROM ELLIE PARK` |
| Salary from the council (credit) alongside council tax (debit) | `Payment from Brighton & Hove City Council` |
| Loan that ends mid-year with a smaller final payment | Zopa, final £143.77 on 12/08 |
| Buy-now-pay-later in two runs of instalments | Klarna 3 × £116.33, then 2 × £42.00 |
| 30-day bus tickets bought most months (fare rise in April), skipped Dec and Aug | `BHBUSES MTICKET` |
| Weekly dog walker paid to a person, variable amount | `S BRIGGS REFERENCE BISCUIT WALKS` |
| Pet food bought every 4–6 weeks at similar amounts | Pets at Home |
| Savings and credit card | Moneybox LISA SO, Amex DD |

## Judgement calls

1. **Housing rises aren't flagged.** Council tax, water, TV licence and rent all rise ≥3% in April or June. The `price-rise` definition covers subscriptions and bills only, so none are expected. If you think a council tax rise should be flagged, change the key, not the detector.
2. **Plan changes aren't price rises.** Spotify Individual → Duo is the household choosing a bigger plan, and Adobe monthly → annual is a billing change. Neither gets a price-rise flag. Spotify gets two truth rows (Individual `active:false`, Duo `active:true`) on the same descriptor, like Apple in the original key. Adobe gets one row (yearly, £238.42), because it's the same product billed differently.
3. **Microsoft 365 is one monthly row.** The annual charge was refunded, so there's no annual plan and no renewal.
4. **Annuals with a single charge** (RAC, National Trust, Komoot, Nintendo, Adobe annual) are in truth as yearly. Telling they're yearly from one charge needs merchant knowledge. That's deliberate: 12 months of data only ever shows an annual plan once.
5. **RAC breakdown cover counts as a bill** (it's switchable), and its renewal counts as `renewal-soon`.
6. **Duplicates name the cheaper side**, as the original key does: Google One (£7.99 vs Dropbox £9.99), Perplexity (£14.76 vs ChatGPT £20).
7. **Not duplicates:** two phone lines in each house, Netflix + Disney+ paid by two different people, Microsoft 365 vs Proton (office suite vs email), the insurance policies (different jobs).
8. **FX subscriptions:** `amount` is the latest sterling charge. Wobbles stay ≤2.1%, so no price rise. Where the descriptor changes each month (HSBC `INT'L` rows, every Santander card row), `desc` is the **latest** row's exact text. A detector has to normalise descriptors to group them.
9. **HelloFresh** `amount` is the base box (£41.99); add-on weeks are ignored. Cadence is weekly despite skipped weeks.
10. **Unknown merchants** are `kind: subscription`, like KLX in the original key. Immediate Media is treated as nameable (it's the BBC magazines publisher), so it isn't flagged unknown. That one's arguable.
11. `previous` is set only on rows with an expected price-rise flag, matching the original key. Drops (LV=, Disney+, E.ON) have no `previous`.
12. `category` is set only on Apple TV, because `APPLE.COM/BILL` is shared with App Store one-offs.
13. `mustNotBeSubscription` uses payee or brand names (`M Kowalska`, `Barclaycard`, `Klarna` …) plus the generic buckets used in the original key (`Groceries`, `Eating out`, `Transport`, `Shopping`). No name appears in both truth and must-not.
14. The key has no `format` field, because neither file matches the existing format labels. It does carry `firstName`, `blurb` and `txns`, as the original does.

## How it was checked

A separate checker read only the finished files and confirmed:

- the header is exact and every date falls in the window
- row counts match the key
- every truth `desc` exists verbatim in its CSV
- each truth amount was actually charged
- active items are still charging and cancelled ones have stopped
- every rise is ≥3%
- FX spread is under 3%
- each renewal-soon falls in 01/11 to 30/11/2026
- the "new" item started 33 days before the end
- the trial is £1 then full price 31 days later, within the last 90 days
- the double charge has no refund
- the stack count is 3 in A and 2 in B
- nothing else accidentally qualifies as new or renewal-soon

The generator and checker were kept outside the repo on purpose.
