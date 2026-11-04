# Subscription Sweep: one-page memo

**From:** Ayo Ahmed · **For:** the Product Builder role at Nous · **3 Nov 2026**

## Why I built this instead of writing a cover letter

Your ad says the person who feels the problem should build the fix. So I picked one of the three surfaces you named, Open Banking and subscriptions, and built the fix.

## What I found first

- **Your ads sell one thing.** I went through 1,268 Nous ads in Meta's Ad Library. 41% open with energy, the rest with "you're overpaying on bills". None open with subscriptions.
- **Your members don't mention subscriptions either.** In 477 Trustpilot reviews, 1 mentions Nous finding savings on subscriptions. 0 name Netflix, Spotify or a gym. Premium includes subscription tracking, but nobody's talking about it.
- **The biggest complaint is money judgement.** 43% of 1–3★ reviews say a switch cost more. 31% say Nous acted without a clear yes. People think in monthly outgoings, not yearly savings.

## What I built

A working product: drop in 12 months of transactions, get every subscription, what it costs a year, and the few worth a look. Duplicates, price rises, trials that became bills, annual renewals, double charges. Then one Nora-style WhatsApp message with at most three items and an explicit yes for each.

**Rules own every £, AI only names things.** The model gets one job: turning "ROBLOX CORPORATION" into "Roblox, gaming, 95% sure". It never sees an amount and never writes a number. Below 60% confidence, its answer is thrown away. I'd planned to have it write the reason lines too, then cut that, because that's where a wrong £ would sneak in.

## How I know it works

- An eval scored on every change: 1,599 payments, 49 labelled repeat payments, 14 expected flags. 32/32 subscriptions found, 49/49 exact prices, 14/14 flags.
- I wrote that data, so I don't trust the 100%. A separate agent that never saw the code wrote a blind test with about 40 traps. First run: 80% of subscriptions found, under half the flags right, every price exact. I fixed what it found, then had a fresh blind set written: 84% found, 73% of flags right, every price still exact, but more false alarms (loan and card repayments). Fixed those too. Every number, first runs included, is on the Accuracy page.
- With the AI off, flag precision drops from 100% to 77.8%. Detection stays the same. So the AI does exactly the one job I gave it.
- 35 unit tests for the boring things that break money products: day-first dates, LEON vs E.ON, Tesco Mobile vs Tesco, a refund vs a double charge.

## Why it's growth, not only product

Every Nous ad sells energy. "I found £506 a year in subscriptions I forgot about" is a creator video you can test in a week, which is how your ads already work (56% of stopped ads ran 7 days or less). It also gives energy-acquired members a second reason to stay in month one, and the clearest reason to upgrade to Premium.

## First 30 days, if I joined

Week 1: run the rules on real consented data and measure the gap. Week 2: hand-label 50 real households with ops and make that the eval. Week 3: send the message to a small Premium slice and watch replies and "that's wrong" rates daily. Week 4: keep the flags people act on, kill the rest, brief one creator video on the best result.

## What I'd cut first

The streaming "stack" flag (most likely to feel preachy), the "new this month" flag if it's mostly intentional sign-ups, and the chart if nobody opens the full sweep. The message is the product.

## Me

Founder of CleanSL8, a cleaning startup I built to 500+ jobs booked and run with AI agents: GTM, booking, pricing and ops, all built myself. Before that, Operations Lead in Corgi's Special Projects unit, brought in to lead AI adoption, and forward-deployed AI and automation work at ServiceNow. I'm not a software engineer. I build like one, with Claude Code as my working environment, and I know where the edge is.

**Links:** the product · [PRD](#/docs/PRD) · [Build log](#/docs/build-log) · [Accuracy](#/accuracy)
