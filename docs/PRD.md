# Subscription Sweep: PRD

**Owner:** Ayo Ahmed · **Status:** working prototype · **Written:** 3 Nov 2026 · **Surface:** Nous subscriptions (Open Banking)

> Built as proof of work for Nous's Product Builder role. Everything here runs; nothing here is Nous data. Sample households are made up. Ad and review numbers are from public sources, linked below.

## TL;DR

Members sign up to Nous to sort energy. Nous already promises subscription tracking in Premium, but nobody talks about it: 0 of 1,268 Nous ads open with subscriptions, and 1 of 477 Trustpilot reviews mentions it. Subscription Sweep reads 12 months of transactions, finds every subscription, and sends one WhatsApp message with the few that are worth a look: two music apps, a price that crept up, a free trial that became £24.99 a month, an annual plan renewing next week.

The rule I built it around: **rules own every £, AI only names things.** A wrong label is annoying. A wrong number costs someone money, and money judgement is already the #1 thing members complain about.

## The problem

From the member's side:

- **They don't know what they're paying for.** Subscriptions are small, monthly and hidden in a statement next to 400 other lines. Apple and Google bill several products under one name.
- **Prices creep.** Netflix goes from £10.99 to £12.99 and nobody notices, because nothing asks them to.
- **Trials convert.** A £0 charge becomes £24.99 a week later. That's the product working as designed, against them.
- **Annual renewals ambush.** £95 for Prime leaves in one go, a year after anyone thought about it.

From Nous's side:

- **The subscriptions surface is invisible.** Premium includes "subscription tracking", but members only ever mention switching (energy in 144 reviews, mobile in 44). When reviewers say "subscription", they mean Nous's own £6.99 plan.
- **Acquisition sells one thing.** Of 1,268 Nous ads in Meta's Ad Library, 41% open with energy and the rest with general "you're overpaying on bills". None open with subscriptions. So members arrive for energy, and the second reason to stay isn't obvious to them.

## Evidence

| Source | What I found | So what |
|---|---|---|
| Meta Ad Library, 1,268 Nous ads (Oct 2025–Oct 2026) | 515 (41%) open with energy; 0 open with subscriptions, insurance or mortgages | Subscriptions are an unused hook for the creator-video machine |
| Same ads | 56% of stopped ads ran a week or less; winners run for months | Nous tests fast. A new hook can be tested in a week |
| Trustpilot, 477 reviews (every 1–4★ + newest 200 5★) | 1 mentions finding savings on subscriptions; 0 name Netflix, Spotify, a gym or streaming | Visible new value, not a copy of something members already know |
| Same, 155 reviews at 1–3★ | 43% are bad money judgement ("it was 30% MORE"); 31% describe a switch they didn't clearly approve | Show the maths in monthly terms. Never act on silence |
| Same | All 5 reviews about connecting a bank or email are negative ("invasive") | Explain why the data is needed; start from what the member chose to share |
| Same, 322 reviews at 4–5★ | 54% praise "done for me", 45% saving money; WhatsApp praised by name | Keep it one explained message in chat, with one-tap actions |

Sources: [Nous ads in Meta's Ad Library](https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=GB&view_all_page_id=104181918671731&search_type=page&media_type=all) (pulled 28 Oct 2026; ad text saved up to 90 characters, so only opening lines are claimed), [Nous on Trustpilot](https://www.trustpilot.com/review/nous.co) (pulled 3 Nov 2026; full method in `research/reviews/findings.md`).

## Who it's for

A Nous member with a connected bank account and 6+ months of history. In practice: the person who signed up from an energy video and has never thought about their subscriptions in one place.

## What it does (v1)

1. Reads the member's transactions. In the prototype that's a CSV from any UK bank; at Nous it's the Open Banking feed.
2. Names each merchant: a dictionary of ~110 rules first, then AI for what's left.
3. Finds payments that repeat weekly, monthly, quarterly or yearly, allowing skipped cycles. Food shops, coffee, transport and money to people are left out on purpose.
4. Works out the current price, any price change, the next charge date, the yearly cost, and whether it's still active.
5. Raises flags, adds up what's worth a look (each payment counted once) and writes the message.

### The eight flags

| Flag | Rule | Counts towards the total as |
|---|---|---|
| Duplicate | Two active services doing one job (music, cloud, AI assistant, food delivery, dating), or two plans at one merchant | The cheaper one's yearly cost |
| Price rise | Same service, at least 3% higher. Bills need the new price to hold for two charges | The increase only |
| Trial ended | A £0–£2 charge 3–35 days before the first full charge, in the last 90 days | Full yearly cost |
| Renews soon | Annual plan due in the 30 days after the statement ends | Full yearly cost |
| Charged twice | Second charge inside one cycle, not refunded within 10 days | One-off, shown as "to claim back" |
| Stack | Three or more TV and film services | The cheapest one |
| Unnamed | A repeat payment neither the rules nor the AI can name | Full yearly cost, "if you don't recognise it" |
| New | Started in the last 45 days | Full yearly cost |

## The rules / AI boundary

The AI gets one job: turn bank text the dictionary doesn't know ("ROBLOX CORPORATION", "SQ *THE BREAD CLUB") into a name, a category, whether that merchant is usually paid yearly, and a confidence score. It sees only that text. No amounts, no dates, nothing personal.

**Hand-over rule:** the AI can only say what a merchant is (name, category, usually-yearly). It can't add a payment, change an amount, move a date or raise a flag. Below 60% confidence its answer is thrown away and the payment shows as "can't name this one", which is itself worth flagging.

I first planned to let the model write the one-line reason for each flag. I cut that: the reason is exactly where a wrong number sneaks in. Reasons are templates filled by the rules.

At Nous I'd run the labelling once per merchant across all members and cache it. One label serves every household that pays that merchant.

## What the member sees

One WhatsApp message from Nora:

> Hi Priya 👋 I've been through your last 12 months of payments. You've got 9 subscriptions costing £1,405 a year. 3 are worth a look:
> 1. Hinge trial is now £24.99 a month
> 2. Headspace renews on 20 Nov (£49.99)
> 3. 2 music subscriptions (save £132/yr)
>
> (+1 more in your sweep)
> I can also check your Octopus Energy and Hyperoptic bills for a better deal.
> Want me to sort any of these? Reply with a number. Nothing gets cancelled without your yes for that one.

*(Exact output for the sample household Priya. Generated by `composeMessage`, not typed.)*

Design choices, each from the research:

- **Monthly first.** "I'm only interested in my monthly outgoings" (1★ review). Every flag leads with £ per month; yearly is secondary.
- **Max three items.** It has to read on a phone. The rest live in the full sweep.
- **Explicit yes, per item.** 31% of low reviews are about acting without clear consent. Cancelling is harder to undo than a tariff switch, so the bar is higher.
- **Show the basis.** Every £ says how it was worked out ("the increase only", "cost of the cheaper one").

## Growth angle

This isn't only a retention feature.

1. **A new ad hook.** Every Nous ad sells energy. "I found £506 a year in subscriptions I forgot about" is a creator video waiting to be made, and Nous already knows how to test a hook in a week.
2. **A second reason to stay.** Members acquired on energy get value in month one that isn't a switch. That's also the clearest reason to upgrade to Premium, which already lists subscription tracking.
3. **It sells the core product.** Every sweep ends with "I can also check your Octopus Energy and Hyperoptic bills". Bills found in the sweep are Nous's main job.
4. **Shareable number.** "£X a year worth a look" is one figure. A result card is a referral loop.

## Metrics

| Metric | Why | Target to learn from |
|---|---|---|
| £ found per sweep (median) | Is there enough to care about? | Set from the first 500 real sweeps |
| % of sweeps with ≥1 flag | Activation: does it find something for most people? | > 70% |
| Reply rate to the message | Do members engage in chat? | Compare with Nora's other proactive messages |
| Confirm-to-cancel rate per flag type | Which flags are worth sending | Kill a flag type that nobody acts on |
| "That's wrong" rate per flag type | False flags erode trust fast | < 2%, checked weekly |
| Premium conversion after a sweep | The money question | vs members who didn't get one |

## How I test it

An eval: a fixed answer key scored after every change (`npm run eval`).

- **Sample households:** 3 households, 1,599 payments, 49 labelled repeat payments, 14 expected flags, with traps planted (a weekly shop, the same coffee most days, rent to a flatmate, a refunded double charge, switching gyms). Result: 32/32 subscriptions, 17/17 bills, 14/14 flags, 49/49 exact price and frequency.
- **Honesty check:** I wrote those households and the rules, so 100% mostly proves the rules do what I meant.
- **Blind test:** two more households written by a separate agent that never saw the code, with about 40 traps. **First run: 80% of subscriptions found (28/35, 4 false alarms), 81% of bills, and 10 of 21 flags.** Every price it found was exact (47/47). It exposed real bugs (an asterisk in "UBER *ONE", quarterly price rises, seasonal energy bills, part-month first payments, transfers that looked like subscriptions) and one gap in the AI's job: yearly plans from merchants the dictionary doesn't know. After fixing them: 35/35, 21/21, 20/21. That second number isn't blind, so a second agent wrote a fresh blind set after the fixes. **Its first run: 84% of subscriptions found, 73% of flags, every price exact (42/42), but more false alarms** (loans, cards, Klarna, cash and a 20p FX fee counted as subscriptions; Santander's "…RATE 1.35/GBP" made Perplexity look like a BP petrol station). Fixed; after that 25/25, 22/22, 14/15. Re-labelling also showed the AI can change its mind between runs, so labels are now stable: a refresh never replaces a confident label with an unsure one. See the [Accuracy page](#/accuracy).
- **Edge cases:** a recorded browser test uploads seven awkward files (empty, not a statement, Barclays, Lloyds, a messy file, income only, five years). It found two bugs a member would hit: no way to upload a second file, and an unreadable file showing "nothing looks off". Both fixed.
- **AI on/off:** with AI labels off, flag precision drops from 100% to 77.8%: 4 false "can't name this one" flags on things a person would know instantly (Roblox, Patreon, Crunchyroll, a bakery subscription). Detection doesn't change. The rules find the repeats; the AI makes them readable.
- **Unit tests:** 35, covering bank formats, day-first dates, LEON vs E.ON, Tesco Mobile vs Tesco, refunds vs double charges, trials, renewals and no double counting.

## Not in v1

- **Cancelling.** v1 finds and explains. Cancelling automatically (the browser agent Nous already has) is v2, per merchant, after the "explicit yes" pattern proves itself.
- **Usage.** Bank data can't show whether you use the gym. I don't pretend it can.
- **Bundles.** If Netflix comes with a Sky package, cancelling it alone may cost more. v1 flags Sky as a bill and leaves bundled services alone; v2 needs bundle knowledge (a top complaint in reviews).
- **Business accounts and joint-account splitting.**

## Risks

| Risk | Mitigation |
|---|---|
| Telling someone to cancel something they love | Language is "worth a look", never "cancel this". Max three items. Explicit yes |
| Wrong £ figure | Rules own every number; AI never writes one. Eval checks exact price on every labelled payment |
| Apple/Google bundle several products under one name | Split by price, say "probably Apple Music", and say where to check |
| Mislabelled merchant | Confidence threshold; "unnamed" fallback; per-merchant cache that a human can fix once for everyone |
| Feels invasive | Explain what's read and why, in the message itself. Prototype runs fully on-device |

## If I joined: first 30 days

1. **Week 1:** run the rules on real (consented) Open Banking data in a notebook. Measure: how many subscriptions per household, how much is worth a look, how often the dictionary misses.
2. **Week 2:** build the eval from 50 real households, labelled by hand with ops. Fix whatever the rules get wrong. Ship the merchant cache.
3. **Week 3:** send the message to a small slice of Premium members. Watch replies and "that's wrong" rates daily.
4. **Week 4:** keep the flag types people act on, kill the rest, and brief one creator video on the best real (anonymised) result.

## What I'd kill first

- **The streaming "stack" flag**, if nobody acts on it. Most people know they have Netflix and Disney+. It's the flag most likely to feel preachy.
- **The "new this month" flag**, if it's mostly things people just signed up to on purpose.
- **The monthly chart**, if members never open the full sweep. The message is the product.

## Open questions for Nous

- How much transaction history does a typical connected member have?
- Does Premium's existing subscription tracking already detect recurrence, and where does it break?
- Can the cancellation browser agent take a "yes" from this message directly?
- Who owns the merchant dictionary today, if anyone?
