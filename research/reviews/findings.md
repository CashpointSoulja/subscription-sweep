# Nous (nous.co) Trustpilot reviews: voice-of-customer findings

For the Subscription Sweep PRD. Source: public Trustpilot pages for nous.co, collected 3 Nov 2026 with the `voc` CLI (no login, nothing paid). Raw reviews and analysis scripts are kept locally, not published (they're other people's writing). Nous here = the UK household agent ("Nora" on WhatsApp), not Nous Research.

## 1. What was pulled (read this first)

| | Count |
|---|---|
| Ratings Trustpilot shows for Nous overall | 2,039 (TrustScore 4.6) |
| Reviews with visible text | 1,893 |
| **Reviews pulled** | **477** (25% of visible reviews) |
| Date range | 4 Dec 2024 to 3 Nov 2026 |

Why 477: logged out, Trustpilot only pages 10 deep (200 reviews) per list; page 11 redirects to login, so we stopped there. Using the public star filter we got **every** 1, 2, 3 and 4-star review (counts match Trustpilot's totals: 104 / 24 / 27 / 122) and the **200 newest** 5-star reviews (of ~1,616). The sample deliberately **over-represents complaints**.

| Stars | Pulled (477) | Trustpilot overall (2,039) | Newest 200 (20 Oct–3 Nov 2026) |
|---|---|---|---|
| 5 | 200 (41.9%) | 1,762 (86.4%) | 160 (80.0%) |
| 4 | 122 (25.6%) | 122 (6.0%) | 13 (6.5%) |
| 3 | 27 (5.7%) | 27 (1.3%) | 2 (1.0%) |
| 2 | 24 (5.0%) | 24 (1.2%) | 4 (2.0%) |
| 1 | 104 (21.8%) | 104 (5.1%) | 21 (10.5%) |

Trend: 1–3★ reviews per quarter (complete set): 7 (2025 Q4), 14 (2026 Q1), 17 (Q2), 59 (Q3), 54 (1 Oct–3 Nov only). Overall review volume also jumped (a £5 sign-up offer and an "up to £2,000" influencer giveaway), so this is rising complaint *volume*, not proof of a rising *rate*.

## 2. Keyword counts (all 477)

| Topic | Rule (case-insensitive) | Reviews | Notes |
|---|---|---|---|
| Subscriptions or cancel | `\bsubscri\w*` OR `\bcancel\w*` | **29 (6.1%)** | Breakdown below |
| "subscri…" only | `\bsubscri\w*` | 4 | 3 = Nous's own £6.99 plan; 1 = Nous finds deals on "utilities and subscriptions" |
| Named consumer subscriptions | `netflix\|spotify\|\bgym\b\|amazon prime\|\bprime\b\|disney\|streaming` | **0** | |
| Bank or email connection (hand-verified) | | **5** | All 1–2★: "invasive", "data harvesting", "didn't want to link" |
| WhatsApp / agent / AI | `whats\s?app\|\bnora\b\|\bagent\b\|\bai\b\|\bbot\b\|automat\w*` | 60 | WhatsApp mostly praise (30); AI/bot/agent mostly blame (35) |
| Savings amount quoted | £ figure AND save-word | 66 | |
| "Cost more" (keyword) | see `analysis/final.py` | 17 | Undercounts: hand reading found **66** |
| Monthly framing | `monthly\|per month\|a month\|direct debit\|\bdd\b` | 55 | |

What the 29 "subscription/cancel" reviews are about (all read by hand): 18 undoing a switch Nous made · 6 leaving Nous itself · 3 Nous's own £6.99 plan · 1 Nous finding savings on "utilities and subscriptions" · 1 Nous cancelling the old provider (positive) · 1 exit fee.

**Bottom line:** in 477 reviews nobody describes Nous finding a forgotten or creeping subscription, and nobody names a streaming, app or gym subscription. Reviews are about switching: energy 144, mobile 44, broadband 24, water 3, insurance 2.

Savings quoted in 4–5★ reviews (self-reported): median **£300** (middle half £229–£400), mostly energy, mostly per year.

## 3. Themes

### Complaints: hand-coded, all 155 reviews rated 1–3★

| # | Theme | Reviews | Share |
|---|---|---|---|
| 1 | **Bad money judgement**: switched deal cost more or missed a better option (existing fixed rate, bundle discount, exit fees, monthly DD up while "annual saving" shown) | **66** | 42.6% |
| 2 | **Switched without clear consent**: auto mode, silence treated as yes | **48** | 31.0% |
| 3 | Poor aftercare | 41 | 26.5% |
| 4 | Execution errors (failed switch, wrong DD/bank, double billing) | 37 | 23.9% |
| 5 | Fee and reward surprises | 20 | 12.9% |

65% of low reviews have theme 1 or 2. At least 3 say Nous claimed a saving when they paid more.

### Praise: keyword rules, all 322 reviews rated 4–5★

| # | Theme | Reviews | Share |
|---|---|---|---|
| 1 | Easy / done for me | 175 | 54.3% |
| 2 | Saved money | 144 | 44.7% |
| 3 | Fast / responsive | 63 | 19.6% |
| 4 | Kept informed / clear explanations | 53 | 16.5% |
| 5 | Helpful / friendly | 49 | 15.2% |

## 4. Quotes (verbatim, under 25 words)

1. "Nous finds better deals for you for your utilities and subscriptions. They do all the donkey work for you" (5★, 3 Nov 2026)
2. "claimed it was £1085 saving but when I got the calculator out, it was 30% MORE than I was currently on." (1★, 29 Oct 2026)
3. "I had already been on the best fixed rate @ £236 per month. The new rate was £272 per month" (2★, 6 Oct 2026)
4. "Be careful if you have bundled packages because it doesn't take these into consideration." (1★, 23 Oct 2026)
5. "I'm not interested in what the savings maybe annually I'm only interested in my monthly outgoings." (1★, 5 Sep 2026)
6. "a switch was authorised because I didn't say 'No' to their suggestion within a certain time period" (1★, 27 Aug 2026)
7. "I would have preferred a heads-up before the switch occurred, plus a brief breakdown explaining why the new plan was a better fit." (4★, 28 Sep 2026)
8. "I didn't want to link me bank account and my email accounts, I kept getting redirected back to whatsapp chat" (2★, 27 Oct 2026)
9. "Nora was able to explain my savings to me, which I really enjoyed and this feels like magic!" (5★, 25 Oct 2026)
10. "Having the WhatsApp chat meant I could ask any questions at any time which made a huge difference" (5★, 31 Oct 2026)

Every quote links to a public review on trustpilot.com/review/nous.co.

## 5. So what for a subscription product

1. **Subscription tracking is invisible in what members say.** 1 of 477 mentions it; 0 name a consumer subscription. A sweep that surfaces forgotten subscriptions would be new, visible value. (Absence in reviews ≠ low usage.)
2. **Money judgement is the #1 complaint, so show the maths in the member's terms.** 43% of low reviews. Show the per-month amount actually leaving the account (from real charges, not estimates), the yearly figure, and what cancelling would lose.
3. **Never act on silence.** 31% describe a switch they didn't clearly approve. Cancelling is harder to undo than a tariff change: explicit yes per item, plus the "heads-up and why".
4. **Bank/email connection is a trust hurdle.** All 5 reviews about it are negative. Start from data the member chooses to share and say why each piece is needed.
5. **Keep what people love: done-for-me, explained, in chat.** One clear explained message, one-tap undo.

## 6. Other sources

Reddit (voc public search, 133 items): 10 posts link to nous.co, all referral/giveaway promos, no customer comments. Login-only sources not used.

## 7. Reproduce

`voc run nous` (plan `~/voc/plans/nous.toml`) unfiltered and with `stars = [1]`…`[5]`. A voc bug was fixed in `~/voc/voc/sources/trustpilot.py` (page 1 with `page=1` dropped the star filter). Scripts: `analysis/analyze.py`, `analysis/final.py`; hand codes `analysis/codes.txt`; numbers `analysis/final-numbers.json`. Reviewer names are first name/initial only.
