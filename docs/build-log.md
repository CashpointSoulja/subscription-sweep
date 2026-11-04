# Build log

How Subscription Sweep went from a job ad to a working product in one session on 3 Nov 2026. Written as I went, with screenshots and the actual test output. Times are London.

---

## 1. Picking the problem (18:30)

The Nous Product Builder ad names three possible first surfaces: Nora, Open Banking and subscriptions, or "whatever's most broken". I picked subscriptions because it's where product and growth overlap. A week earlier I'd pulled all of Nous's ads from Meta's Ad Library: 1,268 of them, and not one opens with subscriptions. Members arrive for energy, and the subscription side of Premium is invisible.

## 2. Using Nous as a member would (18:50)

First I looked at how a new member joins. Sign-up is a web app, not an app-store download, and step one asks for your home address.

![Nous homepage](../public/shots/research-01-nous-homepage.png)
*nous.co, captured 3 Nov 2026*

![Nous sign-up, step one](../public/shots/research-02-nous-signup.png)
*The first sign-up screen: "Where do you live?" I stopped here. The next step needs my real address, so I'll finish it myself.*

## 3. Listening to members (18:51 → 19:15)

I pulled every public 1–4★ Trustpilot review of Nous plus the newest 200 5★ reviews (477 in total, no login, nothing paid), then read every complaint by hand.

| What I found | What I changed in the product |
|---|---|
| 1 of 477 reviews mentions Nous finding savings on subscriptions; 0 name Netflix, Spotify or a gym | Confirms the gap: this is new, visible value |
| 43% of low reviews are bad money judgement | Rules own every £. AI never writes a number |
| "I'm only interested in my monthly outgoings" | Every flag leads with £ per month |
| 31% of low reviews: acted without a clear yes | The message asks for a yes per item. Nothing on silence |
| All 5 reviews about connecting a bank are negative | The prototype runs on a file you choose to share, read on your device |

Full method and quotes: `research/reviews/findings.md`.

## 4. The engine: rules first (19:00)

Five steps: read the file → name the merchant → find repeats → work out prices and dates → raise flags. Everything is plain TypeScript that runs in the browser, so a statement never leaves the device.

Bugs I caught while writing it, before any test ran:

- A `MICROSOFT*` rule would have swallowed Xbox Game Pass. Moved gaming above software.
- The E.ON energy rule matched **LEON**, the restaurant chain. Fixed with word boundaries, and there's a test for it now.
- A family with two EE phone lines (£32 and £22) would have been merged into one bill. Bills are now split by price too.

## 5. Test data with traps (19:05)

Three made-up households, 12 months each, in three different bank formats (Monzo, Nationwide, Starling) to test the file reader. Each has an answer key written from the spec, not from the engine. Traps on purpose: a weekly food shop, the same £3.40 coffee most days, a £2 bus fare most days, rent to a flatmate by standing order, a refunded double charge, switching gyms (not a duplicate), a cancelled subscription, and one merchant nobody could name.

## 6. First score (19:07)

```
OVERALL (rules-only) subs P 100% R 100% · bills P 100% R 100% · flags P 77.8% R 100% · exact £ 49/49 · AI 0/4
```

Detection was right first time. The flags weren't: 4 false "can't name this one" flags, on Roblox, Patreon, Crunchyroll and a local bakery subscription. Exactly the job the AI layer is for.

## 7. The AI layer (19:08)

One job: turn bank text the dictionary doesn't know into a name, a category and a confidence. It sees only the text, never amounts or dates.

| Bank text | Named as | Sure | Used |
|---|---|---|---|
| ROBLOX CORPORATION | Roblox · gaming | 95% | yes |
| SQ *THE BREAD CLUB | The Bread Club · recipe box | 70% | yes |
| CRUNCHYROLL | Crunchyroll · video | 97% | yes |
| PATREON* MEMBERSHIP | Patreon · creator | 95% | yes |
| KLX*MEMBER SERVICES 0203 | Unknown | 20% | no, stays unnamed |

The last one I invented on purpose. The model said it didn't know, which is the right answer. Score after:

```
OVERALL (rules+ai) subs P 100% R 100% · bills P 100% R 100% · flags P 100% R 100% · exact £ 49/49 · AI 4/4
```

I don't trust that 100%: I wrote the data and the rules. So I had a separate agent write a blind test without seeing the code (section 10).

## 8. Unit tests (19:11)

25 tests for the boring things that break money products: Monzo, Nationwide and Starling files, Windows line endings, commas inside quotes, day-first dates (03/11 is 3 November, never 11 March), LEON vs E.ON, Tesco Mobile vs a Tesco shop, transfers to people, switching gyms, a refund vs a double charge, a trial that converted after one charge, a renewal warning, and never counting one payment twice. All 25 pass. Output saved in `docs/evidence/01-unit-tests.txt`.

## 9. The product (19:20 → 19:45)

Direction before any pixels: a paper bank statement on the kitchen table, marked up with a highlighter. The highlighter only ever touches things that are flagged.

![First screen](../public/shots/v2-hero-desktop.png)
*The hero is Priya's real October statement from the sample data, highlighted by the real engine output. Nothing on it is typed by hand.*

First pass of the results page:

![Results page, first pass](../public/shots/v1-sweep-priya-desktop.png)
*Version 1. The flags, phone message and table worked. The chart didn't: it said spending went down £22 a month, only because Priya's yearly Headspace charge landed in November.*

The fix: chart what you're signed up to each month, with yearly plans spread over 12 months. Now it shows the actual creep: Apple Music added in February, NOW cancelled in March, Netflix up in July, Hinge in September.

![Results page, fixed chart](../public/shots/v2-sweep-priya-desktop.png)
*Version 2: £89 → £117 a month.*

Other things the screenshots caught: two margin notes overlapping in the hero, a vague example line, tables not stretching on the docs pages, and a renewal shown as "£50" when the real charge is £49.99. All fixed. Every screenshot run also checks for console errors and for anything wider than a phone screen: none.

## 10. Trying to break it: seven awkward files (19:25)

A recorded browser session uploads seven files into the real app and checks what a member would see: an empty file, a file that isn't a statement, Barclays and Lloyds exports, a messy file (BOM, Windows line endings, commas inside quotes, £ signs, a bad row), an income-only file, and five years of data for speed.

<video src="videos/edge-cases.mp4" controls width="100%"></video>

*The latest run: 7/7 pass, no page errors.*

It took three runs:

| Run | Result | What it found |
|---|---|---|
| 1 | Crashed after the first file | **No way to upload a second file.** Once you'd uploaded one, the box disappeared. A real member would be stuck. Added "Sweep a different file" |
| 1 | Lloyds failed | **Lloyds calls the column "Transaction Description".** The reader only knew "Description". Fixed, with a unit test |
| 2 | 7/7, but… | The screenshot of the broken file showed "£0 a year worth a look", "1 Jan 1970" and "Nothing looks off. Nice." **An unreadable file looked like an all-clear.** That's the worst kind of bug in a money product |
| 3 | 7/7 with stricter checks | Unreadable files now get a clear error and the upload box, never a £0 result |

![Run 1: an unreadable file looked like an all-clear](../public/shots/run1-edge-04-lloyds.png)
*Run 1. The engine read 0 payments and the page still said nothing looked off.*

![Run 3: the same file after the fixes](../public/shots/run3-edge-04-lloyds.png)
*Run 3. Lloyds read properly: Disney+ found, EE as a bill, salary ignored.*

## 11. The blind test (19:33)

I didn't trust my own 100%, so a separate agent wrote two households without seeing the code, with about 40 traps: Netflix under four names, a file sorted newest first, Tesco six ways, seasonal energy bills, a part-month first gym payment, yearly memberships, a friend paid £6 most Tuesdays.

First run, recorded before I touched anything:

```
OVERALL subs P 87.5% R 80% · bills P 100% R 81% · flags P 52.6% R 47.6% · exact £ 47/47
```

80% of subscriptions found, and fewer than half the flags right. Every price it did find was exact, though. What went wrong:

- **Bugs.** `UBER *ONE`: the asterisk broke the match and it was filed as a taxi. A quarterly magazine's price rise split in two (I only joined price levels up to 40 days apart). Seasonal energy split into several bills. A part-month first gym payment looked like a price rise. A standing order to savings and a friend's 5-a-side money looked like subscriptions. And the rule that strips reference codes also deleted "1Password".
- **A gap in the AI's job.** Yearly plans from merchants nobody's dictionary has (English Heritage, Norton, RAC) were invisible, because one charge isn't a pattern. Now the AI also says whether a merchant is usually paid yearly. That's a fact about the merchant, not the amount, so it stays inside the hand-over rule.
- **My scorer was unfair.** It failed flags when the names differed ("LV=" vs "Liverpool Victoria"). About 5 misses were this. I fixed the scorer, not the engine, and kept the first-run numbers as recorded.
- **One disagreement I'm keeping.** The key says a couple's two phone lines are a duplicate. Two people, two phones. Not flagging it.

After the fixes: 35/35 subscriptions, 21/21 bills, 20/21 flags, 56/56 exact prices, and my own households still at 100%. But that's no longer blind, because I've seen the data. So a second agent is writing a fresh blind set (section 12).

## 12. Walkthrough video (19:45)

A scripted tour of the real app, recorded headless with captions. Voiceover script for recording it in my own voice: `docs/video-script.md`.

<video src="videos/walkthrough.mp4" controls width="100%"></video>

Checking the stills caught three more things: "Two **ai** assistant subscriptions" (lowercased), "You've got **1 subscriptions**", and a Lloyds file labelled "Generic". All fixed, with a test for the plural.

## 13. Battery died, picked back up (20:07 → 20:30)

My laptop died mid-build and the Mac restarted, killing the dev server, the second blind-test agent and a half-finished Notion approval. Everything I'd written was on disk, so the recovery was: check every file, re-run every test and score (identical to before the crash), and check the second blind set was complete without reading its answers: 1,285 payments, 50 labelled repeat payments, 15 expected flags, every answer-key line present.

## 14. The second blind test (20:30)

The question: did the fixes from blind set 1 generalise, or did I just fit that test? A different agent wrote two new households after those fixes, with new traps: Santander and HSBC description styles, subscriptions billed in dollars that wobble by pennies, solo-to-family plan switches, monthly-to-annual switches, a cancelled subscription that charges once more, loans, credit cards, Klarna, cash withdrawals, a weekly cleaner paid by transfer.

First run, before touching anything:

```
OVERALL subs P 72.4% R 84% · bills P 100% R 86.4% · flags P 68.8% R 73.3% · exact £ 42/42
```

| | Set 1, first run | Set 2, first run |
|---|---|---|
| Subscriptions found | 80% | 84% |
| Of what it called subscriptions, right | 87.5% | 72.4% |
| Flags found / right | 48% / 53% | 73% / 69% |
| Exact prices | 47/47 | 42/42 |

So: partly. Flags got much better and prices stayed perfect, but false alarms went up. The causes were real:

- Santander writes `CARD PAYMENT TO PERPLEXITY AI,20.00 USD, RATE 1.3550/GBP ON 18-10-2026`. My BP petrol rule matched the "BP" in "**GBP**", so Perplexity became Transport.
- A Spotify solo → Family switch (+42%) was read as a price rise plus a double charge. Over 25% is now a plan change.
- Adobe switched from monthly to one yearly charge and disappeared.
- RAC's renewal wasn't flagged because renewals only covered subscriptions. Yearly bills now get a renewal warning: that's the moment Nous can switch them.
- Card repayments, a car loan, Klarna, cash withdrawals and a 20p foreign-transaction fee counted as subscriptions. New "loans, cards & fees" category, left out like transfers.
- A £19.30 National Trust café visit became a "yearly plan", because the AI said National Trust is usually annual. That hint now needs £25+.
- An HSBC bill payment to a nursery became a £1,212 "subscription". HSBC "BP" payments count as transfers unless the payee is a known bill.

Re-labelling exposed something I hadn't thought about: **the AI changed its mind.** The same bakery descriptor went from 70% sure to 30% between runs. In production that's a label flip-flopping in front of members. Rule added: a refresh never replaces a confident label with an unsure one.

After the fixes (no longer blind): set 2 25/25 subscriptions, 22/22 bills, 14/15 flags, 47/47 exact; set 1 and my own households unchanged. The one miss I'm leaving: Apple TV+ hidden inside an `APPLE.COM/BILL` charge at a price my hints don't know. That's an honest limit of Apple's bundled billing, not something to paper over. Unit tests: 35. Edge-case test re-run: 7/7.

## 15. Into Notion (20:44)

Docs went to Notion so they're easy to share. Three things broke on the way and are fixed in `scripts/publish-notion.py`: Composio wanted every block wrapped, uploads needed a file path, and headings like "1. Picking the problem" were silently turned into numbered lists. I rebuilt that page and checked it by reading it back: 14 headings, 7 screenshots, 2 videos, no duplicates.
