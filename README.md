# Subscription Sweep

Drop in a bank statement. See every subscription, what it costs a year, and the ones worth a look: two music apps, a price that crept up, a free trial that quietly became £24.99 a month.

**Live:** https://subscription-sweep.vercel.app

A working concept by Ayo Ahmed for Nous's Product Builder role (subscriptions surface). Not affiliated with Nous. Sample households are made up.

**Rules own every £. AI only names things.**

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5288
npm test           # unit tests
npm run eval       # score against the answer key
```

Everything runs in the browser, in a background thread. An uploaded statement never leaves the device, and that's enforced: the site's security policy (`connect-src 'none'` in `vercel.json`) tells the browser to refuse any request the page tries to send. Fonts are self-hosted; no analytics.

## How it works

1. **Read** any UK bank export: CSV from Monzo, Starling, Barclays, Lloyds/Halifax, HSBC (no header row), NatWest/RBS, Nationwide (old Windows encoding), Revolut (declined payments left out), Amex and other credit cards (positive charges), plus Santander's text download, OFX, QIF, semicolon and tab files. The file type is checked from its bytes first, so a PDF or spreadsheet gets told how to get the CSV. Several files at once are merged, counting a payment in two files once.
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
| Full browser QA: layout stability (does anything move?), interactions, 17 upload cases, phone, reduced motion, accessibility (axe) | `npm run build && npm run preview`, then `node scripts/qa.mjs <label>` | `docs/evidence/<label>-qa.md`, `docs/videos/` |
| Random use: seeded random clicks, scrolls, resizes, uploads, back/forward | `node scripts/monkey.mjs 300 1 2 3` | console output |
| Recorded browser test, 7 awkward uploads | `node scripts/edge-cases.mjs <label>` | `tests/fixtures/`, `docs/videos/` |
| Evidence shots (flag opened, reading, drop overlay) and `public/og.png` | `node scripts/evidence-shots.mjs <label>` | `public/shots/` |
| Screenshots, all pages, desktop + phone, console-error and overflow check | `node scripts/screenshots.mjs <label>` | `public/shots/` |

The browser scripts default to the production preview on :5289 (`BASE=` to change). The preview sends the same security headers as the live site, so the QA tests the real policy.

Results, including what it got wrong, are on the Accuracy page and in `docs/evidence/`. Screenshots from every test run are in `docs/screenshots/`.

## Docs

- `docs/memo.md`: one-page memo
- `docs/PRD.md`: product requirements
- `docs/build-log.md`: how it was built, with screenshots
- `research/reviews/findings.md`: 477 Trustpilot reviews, analysed

## Structure

```
src/engine/      rules: files.ts (file type, encoding, merging), csv.ts, merchants.ts, detect.ts, message.ts, dates.ts, types.ts
src/pages/       Landing, Sweep, How, Accuracy, Doc
src/components/  Statement, Phone, FlagCard, SpendChart, Upload, Segmented, Sweeping, DropOverlay, ErrorBoundary
src/motion.tsx   reduced-motion check, rolling numbers, reveal on scroll
src/sweep.worker.ts, sweepJob.ts, sweepFiles.ts   reading uploads in a background thread
src/data/        sample households, answer keys, AI label cache, eval results
scripts/         generate-households, label-merchants, eval, make-fixtures, qa, monkey, edge-cases, screenshots, evidence-shots, walkthrough
```
