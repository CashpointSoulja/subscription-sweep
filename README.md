# Subscription Sweep

Drop in a bank statement. See every subscription, what it costs a year, and the ones worth a look: two music apps, a price that crept up, a free trial that quietly became £24.99 a month.

A working concept by Ayo Ahmed for Nous's Product Builder role (subscriptions surface). Not affiliated with Nous. Sample households are made up.

**Rules own every £. AI only names things.**

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5288
npm test           # unit tests
npm run eval       # score against the answer key
```

Everything runs in the browser. An uploaded statement never leaves the device.

## How it works

1. **Read** any UK bank CSV: Monzo, Starling, Barclays, Lloyds/Halifax, Nationwide, HSBC-style, or plain Date/Description/Amount. Day-first dates, £ signs, split in/out columns, BOMs, Windows line endings.
2. **Name** each merchant: ~110 dictionary rules, then cached AI labels for the rest.
3. **Find repeats**: group by merchant and price, check the gaps (weekly, monthly, quarterly, yearly, skipped cycles allowed), join price levels that follow each other (price rises), keep overlapping ones apart (two plans).
4. **Prices and dates**: current price, price change, next charge, yearly cost, active or stopped.
5. **Flags and message**: eight flags, a total that counts each payment once, and a message built only from those numbers.

The AI step (`scripts/label-merchants.ts`) sends only unrecognised merchant text to Claude Haiku and gets back a name, a category, whether that merchant is usually paid yearly, and a confidence. Below 0.6, the answer is discarded. The model never sees an amount or a date. Results are cached in `src/data/merchant-labels.json`, so the app never calls a model.

## Testing

| What | Command | Where |
|---|---|---|
| Unit tests (formats, dates, merchant edge cases, refunds vs double charges, trials, renewals, no double counting) | `npm test` | `tests/engine.test.ts` |
| Answer-key eval, 3 sample households | `npm run eval` | `src/data/answer-key.json` |
| Same, AI labels off | `npx tsx scripts/eval.ts --rules-only` | |
| Blind test #1 (written by a separate agent) | `npx tsx scripts/eval.ts --holdout` | `src/data/holdout/` |
| Blind test #2 (written after the fixes) | `npx tsx scripts/eval.ts --holdout2` | `src/data/holdout2/` |
| Recorded browser test, 7 awkward uploads | `node scripts/edge-cases.mjs <label>` | `tests/fixtures/`, `docs/videos/` |
| Screenshots, all pages, desktop + phone, console-error and overflow check | `node scripts/screenshots.mjs <label>` | `public/shots/` |

Results, including what it got wrong, are on the Accuracy page and in `docs/evidence/`. Screenshots from every test run are in `docs/screenshots/`.

## Docs

- `docs/memo.md`: one-page memo
- `docs/PRD.md`: product requirements
- `docs/build-log.md`: how it was built, with screenshots
- `research/reviews/findings.md`: 477 Trustpilot reviews, analysed

## Structure

```
src/engine/      rules: csv.ts, merchants.ts, detect.ts, message.ts, dates.ts, types.ts
src/pages/       Landing, Sweep, How, Accuracy, Doc
src/components/  Statement, Phone, FlagCard, SpendChart, Upload
src/data/        sample households, answer keys, AI label cache, eval results
scripts/         generate-households, label-merchants, eval, edge-cases, screenshots, walkthrough
```
