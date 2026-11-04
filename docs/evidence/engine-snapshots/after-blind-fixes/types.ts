/** One bank transaction. amount < 0 = money out. date = YYYY-MM-DD. */
export interface Txn {
  date: string;
  description: string;
  amount: number;
}

export type Kind = 'subscription' | 'bill' | 'housing' | 'spending' | 'transfer' | 'income' | 'unknown';

export type Category =
  // subscriptions
  | 'video' | 'music' | 'cloud' | 'gaming' | 'fitness' | 'news' | 'software' | 'ai-assistant'
  | 'books' | 'food-box' | 'food-delivery' | 'dating' | 'wellbeing' | 'education' | 'shopping' | 'creator' | 'charity' | 'other'
  // bills Nous can switch
  | 'energy' | 'broadband' | 'mobile' | 'insurance' | 'tv-package'
  // fixed costs Nous can't switch
  | 'tv-licence' | 'council-tax' | 'water' | 'rent' | 'mortgage' | 'vehicle-tax'
  // not subscriptions
  | 'groceries' | 'eating-out' | 'transport' | 'retail' | 'person' | 'salary';

export type LabelSource = 'dictionary' | 'ai' | 'unknown';

export interface MerchantInfo {
  key: string;            // stable grouping key
  name: string;           // human name, e.g. "Netflix"
  category: Category;
  kind: Kind;
  source: LabelSource;
  /** Charges from this merchant can be several different subscriptions (Apple, Google). */
  multiProduct?: boolean;
  /** Typical yearly price range, lets a single charge count as an annual plan. */
  yearly?: [number, number];
  /** How sure the label is (AI labels carry their own). */
  confidence?: number;
}

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Series {
  id: string;
  merchant: MerchantInfo;
  /** Optional extra detail, e.g. "probably Apple Music" for a multi-product biller. */
  productHint?: string;
  cadence: Cadence;
  charges: Txn[];
  firstDate: string;
  lastDate: string;
  currentAmount: number;     // positive £
  previousAmount?: number;   // set when the price changed
  priceChangeDate?: string;
  monthlyCost: number;
  annualCost: number;
  nextDue: string;
  status: 'active' | 'ended';
  confidence: number;        // 0–1, from regularity + label
  trialStart?: string;       // date of the £0–£2 trial charge, if seen
  extraCharges: Txn[];       // charges that landed twice in one cycle
}

export type FlagType =
  | 'duplicate'        // two services doing the same job
  | 'price-rise'       // same service, higher price
  | 'trial-converted'  // free/cheap trial became a full charge
  | 'new'              // started in the last 45 days
  | 'renewal-soon'     // annual plan renews in the next 30 days
  | 'double-charge'    // charged twice in one cycle, not refunded
  | 'stack'            // 3+ video services
  | 'unknown';         // repeat payment we can't name

export interface Flag {
  id: string;
  type: FlagType;
  seriesIds: string[];
  /** The series whose cost counts as the saving (e.g. the cheaper of a duplicate pair). */
  savingSeriesId?: string;
  title: string;
  detail: string;
  /** £ value of acting on this flag. */
  impact: number;
  impactPeriod: 'year' | 'once' | 'none';
  basis: string;          // how impact was worked out, shown to the member
  severity: 1 | 2 | 3;    // 3 = act now
}

export interface SweepResult {
  period: { start: string; end: string; days: number };
  txnCount: number;
  series: Series[];
  subscriptions: Series[];   // active, kind = subscription
  bills: Series[];           // active, switchable bills
  fixed: Series[];           // active rent/council tax/etc
  ended: Series[];           // stopped before the period end
  flags: Flag[];
  totals: {
    subscriptionsAnnual: number;
    billsAnnual: number;
    worthALookAnnual: number;  // de-duplicated per series
    toClaimBack: number;       // one-off double charges
  };
  unlabelled: string[];        // raw descriptors that recur but we couldn't name
}
