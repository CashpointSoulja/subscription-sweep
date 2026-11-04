import { describe, expect, it } from 'vitest';
import { addDays, addMonths, parseDate } from '../src/engine/dates';
import { composeMessage, parseAmount, parseBankCsv, resolveMerchant, sweep, type Txn } from '../src/engine';

const monthly = (desc: string, amount: number, from: string, n: number, day = 9): Txn[] =>
  Array.from({ length: n }, (_, i) => ({ date: addMonths(`${from.slice(0, 7)}-${String(day).padStart(2, '0')}`, i), description: desc, amount: -amount }));

describe('reading bank files', () => {
  it('reads Monzo exports', () => {
    const csv = 'Transaction ID,Date,Time,Type,Name,Emoji,Category,Amount,Currency\ntx_1,09/10/2026,09:00:00,Card payment,NETFLIX.COM,,general,-12.99,GBP';
    const r = parseBankCsv(csv);
    expect(r.format).toBe('Monzo');
    expect(r.txns).toEqual([{ date: '2026-10-09', description: 'NETFLIX.COM', amount: -12.99 }]);
  });
  it('reads Nationwide exports with a preamble, £ signs, thousands commas and Paid out/Paid in columns', () => {
    const csv = '"Account Name:","FlexDirect"\n\n"Date","Transaction type","Description","Paid out","Paid in","Balance"\n"01 Nov 2025","Payment to","NATIONWIDE MORTGAGE","£1,240.00","",""\n"28 Nov 2025","Transfer from","SALARY","","£2,890.00",""';
    const r = parseBankCsv(csv);
    expect(r.txns.map(t => t.amount)).toEqual([-1240, 2890]);
  });
  it('reads Starling exports and Windows line endings with a BOM', () => {
    const csv = '﻿Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP)\r\n05/10/2026,STRAVA,STRAVA,CARD,-8.99,100.00\r\n';
    expect(parseBankCsv(csv).txns[0]).toEqual({ date: '2026-10-05', description: 'STRAVA', amount: -8.99 });
  });
  it('reads Lloyds exports ("Transaction Description", separate Debit/Credit Amount)', () => {
    const csv = "Transaction Date,Transaction Type,Sort Code,Account Number,Transaction Description,Debit Amount,Credit Amount,Balance\n03/10/2026,DEB,'30-94-12,12345678,DISNEY PLUS,7.99,,1200.00\n28/10/2026,BGC,'30-94-12,12345678,EMPLOYER LTD SALARY,,2100.00,3280.00";
    const r = parseBankCsv(csv);
    expect(r.txns.map(t => [t.description, t.amount])).toEqual([['DISNEY PLUS', -7.99], ['EMPLOYER LTD SALARY', 2100]]);
  });
  it('keeps commas inside quoted descriptions', () => {
    const r = parseBankCsv('Date,Description,Amount\n01/10/2026,"SHOP, LONDON",-5.00');
    expect(r.txns[0].description).toBe('SHOP, LONDON');
  });
  it('reads day-first dates, never US month-first', () => {
    expect(parseDate('03/11/2026')).toBe('2026-11-03');
    expect(parseDate('3 Sept 2026')).toBe('2026-09-03');
    expect(parseDate('13/13/2026')).toBeNull();
  });
  it('handles odd amount formats', () => {
    expect(parseAmount('(12.50)')).toBe(-12.5);
    expect(parseAmount('12.50 DR')).toBe(-12.5);
    expect(parseAmount('')).toBeNull();
  });
  it('explains what is wrong with a file it cannot read', () => {
    const r = parseBankCsv('foo,bar\n1,2');
    expect(r.txns).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/columns/);
  });
  it('handles an empty file', () => {
    expect(parseBankCsv('').warnings[0]).toMatch(/empty/);
  });
});

describe('naming merchants', () => {
  it('strips payment processors', () => expect(resolveMerchant('PAYPAL *DISNEYPLUS 35314369001').name).toBe('Disney+'));
  it('tells Tesco Mobile from a Tesco shop', () => {
    expect(resolveMerchant('TESCO MOBILE').kind).toBe('bill');
    expect(resolveMerchant('TESCO STORES 2041').kind).toBe('spending');
  });
  it('does not mistake LEON (restaurant) for E.ON (energy)', () => expect(resolveMerchant('LEON RESTAURANTS').category).toBe('eating-out'));
  it('treats standing orders to people as transfers', () => expect(resolveMerchant('STO J PATEL BILLS').kind).toBe('transfer'));
  it('uses an AI label only when confident', () => {
    expect(resolveMerchant('KLX*MEMBER SERVICES', { 'KLX MEMBER SERVICES': { name: 'Unknown', category: 'other', confidence: 0.2 } }).source).toBe('unknown');
    expect(resolveMerchant('ROBLOX CORPORATION', { 'ROBLOX CORPORATION': { name: 'Roblox', category: 'gaming', confidence: 0.95 } }).name).toBe('Roblox');
  });
});

describe('finding subscriptions', () => {
  const END = '2026-10-31';
  it('finds a monthly subscription and works out the yearly cost', () => {
    const r = sweep(monthly('SPOTIFY', 11.99, '2025-11-01', 12), { periodEnd: END });
    expect(r.subscriptions).toHaveLength(1);
    expect(r.subscriptions[0].annualCost).toBe(143.88);
  });
  it('ignores a weekly food shop and daily coffee even at the same price', () => {
    const txns: Txn[] = [];
    for (let i = 0; i < 52; i++) txns.push({ date: addDays('2025-11-01', i * 7), description: 'TESCO STORES', amount: -(30 + (i % 7) * 9) });
    for (let d = 1; d <= 28; d++) txns.push({ date: `2026-10-${String(d).padStart(2, '0')}`, description: 'PRET A MANGER', amount: -3.4 });
    expect(sweep(txns, { periodEnd: END }).subscriptions).toHaveLength(0);
  });
  it('ignores a same-price daily bus fare from an unknown merchant', () => {
    const txns: Txn[] = Array.from({ length: 40 }, (_, i) => ({ date: `2026-${i < 20 ? '09' : '10'}-${String((i % 20) + 1).padStart(2, '0')}`, description: 'BEE NETWORK BUS', amount: -2 }));
    expect(sweep(txns, { periodEnd: END }).subscriptions).toHaveLength(0);
  });
  it('spots a price rise and only counts the increase', () => {
    const txns = [...monthly('NETFLIX.COM', 10.99, '2025-11-01', 8), ...monthly('NETFLIX.COM', 12.99, '2026-07-01', 4)];
    const r = sweep(txns, { periodEnd: END });
    const f = r.flags.find(f => f.type === 'price-rise')!;
    expect(f.impact).toBe(24);
    expect(r.subscriptions).toHaveLength(1);
  });
  it('marks a cancelled subscription as ended, not active', () => {
    const r = sweep(monthly('NOWTV.COM', 9.99, '2025-11-01', 5), { periodEnd: END });
    expect(r.subscriptions).toHaveLength(0);
    expect(r.ended[0].merchant.name).toBe('NOW');
  });
  it('does not call switching gyms a duplicate', () => {
    const r = sweep([...monthly('THE GYM GROUP', 22.99, '2025-11-01', 7, 1), ...monthly('PUREGYM LTD', 27.99, '2026-06-01', 5, 6)], { periodEnd: END });
    expect(r.flags.filter(f => f.type === 'duplicate')).toHaveLength(0);
  });
  it('flags two music apps and saves the cheaper one', () => {
    const r = sweep([...monthly('SPOTIFY', 11.99, '2025-11-01', 12, 14), ...monthly('APPLE.COM/BILL', 10.99, '2026-02-01', 9, 22)], { periodEnd: END });
    const f = r.flags.find(f => f.type === 'duplicate')!;
    expect(f.impact).toBe(131.88);
  });
  it('flags an unrefunded double charge but not a refunded one', () => {
    const base = monthly('DISNEY PLUS', 12.99, '2025-11-01', 12, 3);
    const double = sweep([...base, { date: '2026-09-04', description: 'DISNEY PLUS', amount: -12.99 }], { periodEnd: END });
    expect(double.totals.toClaimBack).toBe(12.99);
    const refunded = sweep([...base, { date: '2026-09-04', description: 'DISNEY PLUS', amount: -12.99 }, { date: '2026-09-08', description: 'DISNEY PLUS', amount: 12.99 }], { periodEnd: END });
    expect(refunded.totals.toClaimBack).toBe(0);
  });
  it('catches a free trial that became a paid plan after one charge', () => {
    const r = sweep([{ date: '2026-09-28', description: 'STRAVA', amount: 0 }, { date: '2026-10-05', description: 'STRAVA', amount: -8.99 }], { periodEnd: END });
    expect(r.flags.map(f => f.type)).toContain('trial-converted');
  });
  it('warns before an annual plan renews', () => {
    const r = sweep([{ date: '2025-11-14', description: 'AMAZON PRIME*2B1QX', amount: -95 }, ...monthly('SPOTIFY', 11.99, '2025-11-01', 12)], { periodEnd: END });
    const f = r.flags.find(f => f.type === 'renewal-soon')!;
    expect(f.title).toMatch(/14 Nov/);
  });
  it('never counts one series twice in the headline number', () => {
    const r = sweep([...monthly('NETFLIX.COM', 18.99, '2025-11-01', 12, 2), ...monthly('NETFLIX.COM', 5.99, '2026-01-01', 10, 19), ...monthly('DISNEY PLUS', 12.99, '2025-11-01', 12, 3), ...monthly('PARAMOUNTPLUS.COM', 6.99, '2025-11-01', 12, 21)], { periodEnd: END });
    // the £5.99 Netflix plan is both "duplicate" and "cheapest in the stack": counted once
    expect(r.totals.worthALookAnnual).toBe(71.88);
  });
  it('returns an empty result for an empty statement', () => {
    const r = sweep([], { periodEnd: END });
    expect(r.subscriptions).toHaveLength(0);
    expect(composeMessage(r, 'Sam').lines.join(' ')).toMatch(/Nothing looks off/);
  });
});

describe('merchant keys', () => {
  it('drops reference codes but keeps brands with digits in their name', async () => {
    const { keyOf } = await import('../src/engine/merchants');
    expect(keyOf('1PASSWORD.COM')).toBe('1PASSWORD');
    expect(keyOf('FMX SVCS 448213')).toBe('FMX SVCS');
    expect(keyOf('Spotify PP4TSUXZV2')).toBe(keyOf('Spotify PP9QWERTY12'));
  });
  it('treats savings standing orders and payments to friends as transfers', () => {
    expect(resolveMerchant('SAVINGS SO 204577 43128890').kind).toBe('transfer');
    expect(resolveMerchant('C ADEYEMI 5ASIDE').kind).toBe('transfer');
    expect(resolveMerchant('UBER *ONE').name).toBe('Uber One');
    expect(resolveMerchant('TESCO CLUBCARD PLUS').kind).toBe('subscription');
  });
});

describe('message copy', () => {
  it('says "1 subscription", not "1 subscriptions"', () => {
    const txns = Array.from({ length: 6 }, (_, i) => ({ date: addMonths('2026-05-03', i), description: 'DISNEY PLUS', amount: -7.99 }));
    const lines = composeMessage(sweep(txns, { periodEnd: '2026-10-31' }), 'Sam').lines.join(' ');
    expect(lines).toMatch(/1 subscription costing/);
  });
});

describe('second blind test fixes', () => {
  const END = '2026-10-31';
  it('reads through Santander FX wrappers ("GBP" is not BP fuel)', () => {
    const m = resolveMerchant('CARD PAYMENT TO PERPLEXITY AI,20.00 USD, RATE 1.3550/GBP ON 18-10-2026');
    expect(m.name).toBe('Perplexity Pro');
    expect(resolveMerchant('CARD PAYMENT TO TPR*SUBSCR 0845,6.00 GBP, RATE 1.00/GBP ON 09-10-2026').kind).toBe('unknown');
  });
  it('reads through HSBC prefixes and direct-debit mandates', () => {
    expect(resolveMerchant('VIS NETFLIX.COM').name).toBe('Netflix');
    expect(resolveMerchant('DIRECT DEBIT PAYMENT TO TOOB LIMITED REF TB205571, MANDATE NO 0016').category).toBe('broadband');
    expect(resolveMerchant('STANDING ORDER VIA FASTER PAYMENT TO HOVE HOMES LETTINGS REFERENCE FLAT3').category).toBe('rent');
  });
  it('never counts loans, cards, buy-now-pay-later, cash or bank fees as subscriptions', () => {
    for (const d of ['BARCLAYCARD', 'AMERICAN EXPRESS', 'KLARNA', 'BLACK HORSE', 'CASH WITHDRAWAL AT SANTANDER', 'NON-STERLING TRANSACTION FEE'])
      expect(resolveMerchant(d).kind, d).toBe('transfer');
  });
  it('treats a big jump at one merchant as a plan change, not a price rise', () => {
    const solo = monthly('SPOTIFY', 11.99, '2025-11-01', 6, 14);
    const family = monthly('SPOTIFY', 16.99, '2026-05-01', 6, 20);
    const r = sweep([...solo, ...family], { periodEnd: END });
    expect(r.flags.filter(f => f.type === 'price-rise' || f.type === 'double-charge')).toHaveLength(0);
    expect(r.subscriptions.map(s => s.currentAmount)).toEqual([16.99]);
  });
  it('spots a monthly plan switched to annual', () => {
    const r = sweep([...monthly('ADOBE SYSTEMS SOFTWARE', 19.97, '2025-11-01', 5, 10), { date: '2026-04-10', description: 'ADOBE SYSTEMS SOFTWARE', amount: -238.42 }], { periodEnd: END });
    expect(r.subscriptions[0].cadence).toBe('yearly');
  });
  it('warns before a yearly bill renews, without inventing a saving', () => {
    const r = sweep([{ date: '2025-11-20', description: 'DD RAC MOTORING SERVICES', amount: -109 }, ...monthly('SPOTIFY', 11.99, '2025-11-01', 12)], { periodEnd: END });
    const f = r.flags.find(f => f.type === 'renewal-soon')!;
    expect(f.impactPeriod).toBe('none');
    expect(f.detail).toMatch(/better deal/);
  });
});
