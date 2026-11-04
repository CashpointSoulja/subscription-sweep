# Holdout test set

Two synthetic UK households, 01/11/2025 to 31/10/2026. They were written **without reading `src/engine` or `scripts`**, so the score measures the detector, not how well it was tuned to this data. Don't tune the detector against these files. If you do, they stop being a holdout.

| File | Household | Rows | Order |
|---|---|---|---|
| `holdout-a.csv` | Hannah & Dev: couple renting in Brixton, joint account | 696 | oldest first |
| `holdout-b.csv` | The Hughes family: two adults and two kids, Leeds, mortgage | 697 | **newest first** |
| `holdout-key.json` | answer key: 28 + 31 recurring payments, 12 + 9 expected flags | | |

Format: `Date,Description,Amount`, DD/MM/YYYY, money out negative, CRLF line endings, descriptions with commas quoted, two `0.00` rows.

## Household A: Hannah & Dev

| Trap | In the data | Right answer |
|---|---|---|
| Descriptor drift | Netflix appears as `NETFLIX.COM`, `NETFLIX INTERNATIONAL B.V.`, `Netflix.com Amsterdam`, then `PAYPAL *NETFLIX` from May | one Netflix sub |
| Random-code descriptor | `Spotify P` + a new 9-character code every month | one Spotify sub |
| Price rise | Spotify 11.99 → 12.99 (Mar), Virgin Media 54 → 58 (Apr), Liverpool Victoria 9.37 → 10.84 (Jul renewal) | 3 price-rise flags |
| Apple billing several products under one name | `APPLE.COM/BILL` at 10.99 (Music), 2.99 (iCloud+), 8.99 (TV+, Dec–Mar only) plus 5 one-off app purchases | 3 Apple subs, TV+ cancelled, one-offs ignored |
| Two music services | Spotify plus Apple Music | duplicate (Apple, 10.99) |
| Two AI assistants, one new | ChatGPT Plus all year; Claude Pro from 24 Sep | duplicate and new (Claude Pro) |
| Two phone lines, same network | `HUTCHISON 3G UK LTD` at 16.00 on the 6th and 38.00 on the 21st | two bills, duplicate, **not** a double charge |
| Billed on the 31st | ChatGPT lands on 30 Nov, 28 Feb, 30 Apr and so on | monthly |
| Failed DD, retried 3 days later | Virgin −54 on 19 Jan, `UNPAID DD VIRGIN MEDIA PYMTS` +54 the same day, −54 on 22 Jan | not a double charge |
| Refunded double charge | Netflix twice on 14 Jul, +12.99 back on 17 Jul | no flag |
| Unrefunded double charge | Disney+ twice on 3 Sep | double-charge |
| Pause and restart | NOW (`NOWTV.COM`) Nov–Jan, gap, then `NOW TV LTD` from May | active, one sub |
| Streaming stack | Netflix, Disney+ and NOW all active at the end | stack |
| Trial converted | Audible 0.99 (14 Aug), then 8.99 in Sep and Oct | trial-converted |
| £0.00 trial that never converted | `PARAMOUNT+ UK` 0.00 once | not a subscription |
| Cancelled, then switched gym | Stronghold Gym (local) to May; PureGym from Jun (pro-rata 18.32 first) | Stronghold cancelled, PureGym active, no duplicate |
| Weekly sub with skipped weeks | HelloFresh every Wednesday, 8 weeks skipped, two weeks with extras (52.48, 49.48) | weekly 45.99, no price rise |
| Annual, renews soon | English Heritage 94.00 on 10 Nov 2025 | renewal-soon |
| Annual, just outside the window | 1Password 27.12 (USD, plus a non-sterling fee) on 6 Dec 2025, renews 36 days out | yearly, **no** renewal-soon |
| Quarterly | The Economist 51.00, Dec/Mar/Jun/Sep | quarterly |
| Council tax runs 10 months | Lambeth: Nov–Jan, nothing in Feb–Mar, Apr–Oct; new rate from Apr, odd first instalment (172.06) | monthly, housing |
| Same council, both directions | `LB LAMBETH SALARIES` is Dev's pay (income) and `LB LAMBETH COUNCIL TAX` goes out | salary isn't a payment |
| Energy direct debit going down | Octopus 98 → 86, plus a +142.30 credit refund | no price-rise flag |
| Charity sounds like housing | `SHELTER` 12.00 DD | charity subscription, not housing |
| Unknown merchant | `PAYPAL *VLXSERV` 6.49, lands any day from the 16th to the 19th | unknown |
| Subscription and purchases at one shop | Club Pret 5.00/month plus ad-hoc `PRET A MANGER BRIXTON` purchases | only the club counts |
| Same coffee, nearly every day | Costa 3.65 on office days, rising to 3.80 in Jan | not a sub, no price rise |
| Daily fares | `TFL TRAVEL CH` most office days; fares go up 1 Mar | not a sub |
| Regular payment to a friend | `C ADEYEMI 5ASIDE` 6.00 most Tuesdays (one 12.00 week) | not a sub |
| Standing order to savings | `SAVINGS SO 204577 43128890` 300 on the 26th | not a fixed cost |
| Pay in 3 | `KLARNA*ASOS.COM` 26.33 × 3 | not a sub |

## Household B: the Hughes family

| Trap | In the data | Right answer |
|---|---|---|
| Newest-first file | rows run from Oct 2026 back to Nov 2025 | order shouldn't matter |
| Tesco five ways | `TESCO STORES` (weekly shop), `TESCO PFS` (fuel), `TESCO EXPRESS`, `TESCO MOBILE` (bill), `TESCO CLUBCARD PLUS` (sub), `TESCO BANK` (variable credit-card repayment) | only Mobile and Clubcard Plus |
| Council vs council-run gym | `LEEDS CITY COUNCIL` (council tax, 10 months) and `LEEDS CC ACTIVE LEEDS` (gym 39.90) | housing and subscription, kept separate |
| Variable energy | EDF from 66.42 to 205.66 with the seasons | bill, **no** price-rise flag |
| Price rises | Sky 73 → 78.50 (Apr); The Week Junior 43.99 → 47.99 (quarterly, Jun) | 2 price-rise flags |
| Real but not obvious | `FUTURE PUBLISHING LTD` is The Week Junior; `NORTONLIFELOCK`; `SPLASH SWIM ACADEMY GC` (GoCardless) | name them |
| Two cloud plans | Google One 1.99 plus iCloud+ 2.99 | duplicate (Google One) |
| Two food-delivery memberships | Deliveroo Plus 3.49 (billed on the 30th, so 28 Feb) plus Uber One 5.99; also one-off `DELIVEROO`, `UBER *EATS` and `UBER *TRIP` orders | duplicate (Deliveroo Plus); orders ignored |
| £0.00 trial, converted long ago | Uber One 0.00 on 19 Jan, paid from 19 Feb | **no** trial-converted (outside 90 days) |
| Trial converted | SimplyCook 1.00 (20 Aug), then 12.99 Sep and Oct | trial-converted |
| New | Xbox Game Pass from 26 Sep; also a one-off `MICROSOFT*STORE` 19.99 | new; the store purchase isn't a sub |
| Unrefunded double charge | Spotify Family 19.99 on 5 Oct **and** 6 Oct | double-charge |
| Refunded double charge | Uber One twice on 19 Jun, +5.99 back on 22 Jun | no flag |
| Failed DD, retried | Admiral 9 Mar, `RETURNED D/D` the same day, re-presented 12 Mar | not a double charge |
| Cancelled mid-year | Amazon Prime 8.99 Nov–Mar with a random code each month (`AMAZON PRIME*…`, `Amazon Prime*…`, `AMZNPrime UK*…`); `PRIME VIDEO*` rentals carry on afterwards | cancelled; rentals aren't Prime |
| Pause and restart | Swim school, no charge in August | active |
| Google billing | `GOOGLE *Roblox Corporatio` 4.99 monthly plus Robux one-offs at other prices | one Roblox sub |
| Apple one-offs | iCloud 2.99 monthly plus a child's in-app buys | one Apple sub |
| Annuals | Norton 84.99 (renews in 21 days: flag); TV licence 174.50 paid in full in Mar; RAC 119.00 in Apr | renewal-soon only for Norton |
| Charity DD and charity shop | `CANCER RESEARCH UK` 8.00 DD plus a 6.50 shop purchase | one sub |
| Kids' account | `GOHENRY` 4.99 fee (sub) and `GOHENRY TOPUP` pocket money | only the fee |
| Unknown | `FMX SVCS 448213` 11.00 DD | unknown |
| Weekly bus ticket | `FIRST BUS MTICKET` 21 → 22 most Mondays (Tuesday after a bank holiday), day tickets some weeks | not a sub |
| Same breakfast most days | `GREGGS` 3.25 → 3.40 | not a sub |
| Recurring but not a sub | `PARENTPAY` school-meal top-ups, `L CARTER HOLIDAY` 100 × 5 to a friend, `HMRC CHILD BENEFIT` every 4 weeks (income) | none in truth |
| Moved dates | DDs move off weekends and bank holidays; salaries move earlier; Christmas pay comes early | — |

## Judgment calls the key makes

1. **Housing rises carry no flag.** Council tax and water went up in April. The key records `previous` but expects no price-rise, because price-rise is defined for subscriptions and bills.
2. **Two Three lines count as a duplicate.** This follows the spec's "two plans at the same merchant" literally, even though they're two people's phones. If the product decides household lines aren't duplicates, delete that one flag.
3. **Streaming overlap is a stack, not a duplicate.** Sky's TV package is a bill and doesn't count toward a stack, so B has no stack.
4. **Duplicate flags name the cheaper item and give its price,** matching `answer-key.json`.
5. **DVLA vehicle tax is housing** (a fixed cost you can't switch). Charity DDs are subscriptions with `category: "charity"`.
6. **Shared-merchant noise isn't in `mustNotBeSubscription`.** Pret purchases, Deliveroo/Uber orders, GoHenry top-ups and Prime Video rentals would collide by name with real subscriptions. They're listed here only.
7. For descriptors that change every month (Spotify in A, Amazon Prime in B), `desc` is one real sample from the CSV.
