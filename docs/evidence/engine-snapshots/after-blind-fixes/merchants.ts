import type { Category, Kind, MerchantInfo } from './types';

type Entry = { re: RegExp; name: string; category: Category; multiProduct?: boolean; yearly?: [number, number] };

export const KIND_OF: Record<Category, Kind> = {
  video: 'subscription', music: 'subscription', cloud: 'subscription', gaming: 'subscription', fitness: 'subscription',
  news: 'subscription', software: 'subscription', 'ai-assistant': 'subscription', books: 'subscription',
  'food-box': 'subscription', 'food-delivery': 'subscription', dating: 'subscription', wellbeing: 'subscription',
  education: 'subscription', shopping: 'subscription', creator: 'subscription', charity: 'subscription', other: 'subscription',
  energy: 'bill', broadband: 'bill', mobile: 'bill', insurance: 'bill', 'tv-package': 'bill',
  'tv-licence': 'housing', 'council-tax': 'housing', water: 'housing', rent: 'housing', mortgage: 'housing', 'vehicle-tax': 'housing',
  groceries: 'spending', 'eating-out': 'spending', transport: 'spending', retail: 'spending',
  person: 'transfer', salary: 'income',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  video: 'TV & film', music: 'Music', cloud: 'Cloud storage', gaming: 'Gaming', fitness: 'Fitness', news: 'News',
  software: 'Software', 'ai-assistant': 'AI assistant', books: 'Books & audio', 'food-box': 'Recipe boxes',
  'food-delivery': 'Delivery membership', dating: 'Dating', wellbeing: 'Wellbeing', education: 'Learning',
  shopping: 'Shopping membership', creator: 'Creator membership', charity: 'Charity', other: 'Other',
  energy: 'Energy', broadband: 'Broadband', mobile: 'Mobile', insurance: 'Insurance', 'tv-package': 'TV package',
  'tv-licence': 'TV Licence', 'council-tax': 'Council tax', water: 'Water', rent: 'Rent', mortgage: 'Mortgage', 'vehicle-tax': 'Vehicle tax',
  groceries: 'Groceries', 'eating-out': 'Eating out', transport: 'Transport', retail: 'Shopping', person: 'Transfer', salary: 'Income',
};

// Order matters: specific patterns before general ones (Tesco Mobile before Tesco, Pret Club before Pret).
const DICTIONARY: Entry[] = [
  // ── multi-product billers ───────────────────────────────
  { re: /APPLE\.COM\/BILL|^APPLE\.COM|ITUNES\.COM/, name: 'Apple', category: 'other', multiProduct: true },
  { re: /GOOGLE \*?YOUTUBE ?PREMIUM|YOUTUBEPREMIUM/, name: 'YouTube Premium', category: 'video' },
  { re: /GOOGLE \*?GOOGLE ?ONE|GOOGLE STORAGE/, name: 'Google One', category: 'cloud', yearly: [15, 100] },
  { re: /^GOOGLE ?\*|GOOGLE PLAY/, name: 'Google Play', category: 'other', multiProduct: true },
  // ── TV & film ───────────────────────────────────────────
  { re: /NETFLIX/, name: 'Netflix', category: 'video' },
  { re: /DISNEY ?PLUS|DISNEYPLUS|DISNEY\+/, name: 'Disney+', category: 'video', yearly: [60, 130] },
  { re: /AMAZON ?PRIME|AMZN ?PRIME|PRIME VIDEO|AMZNPRIME/, name: 'Amazon Prime', category: 'shopping', yearly: [80, 110] },
  { re: /NOW ?TV|^NOW\b|NOWTV/, name: 'NOW', category: 'video' },
  { re: /PARAMOUNT/, name: 'Paramount+', category: 'video', yearly: [50, 80] },
  { re: /DAZN/, name: 'DAZN', category: 'video' },
  { re: /ITVX/, name: 'ITVX Premium', category: 'video' },
  { re: /BRITBOX/, name: 'BritBox', category: 'video' },
  // ── music ───────────────────────────────────────────────
  { re: /SPOTIFY/, name: 'Spotify', category: 'music' },
  { re: /AMAZON MUSIC|AMZN MUSIC|AMZN DIGITAL.*MUSIC/, name: 'Amazon Music', category: 'music' },
  { re: /TIDAL/, name: 'Tidal', category: 'music' },
  { re: /DEEZER/, name: 'Deezer', category: 'music' },
  // ── cloud & software ────────────────────────────────────
  { re: /XBOX|MICROSOFT\s*GAME/, name: 'Xbox Game Pass', category: 'gaming' },
  { re: /DROPBOX/, name: 'Dropbox', category: 'cloud', yearly: [90, 140] },
  { re: /MICROSOFT ?365|MSFT ?\*|MICROSOFT\*/, name: 'Microsoft 365', category: 'software', yearly: [55, 110] },
  { re: /ADOBE/, name: 'Adobe', category: 'software' },
  { re: /CANVA/, name: 'Canva', category: 'software', yearly: [80, 130] },
  { re: /OPENAI|CHATGPT/, name: 'ChatGPT Plus', category: 'ai-assistant' },
  { re: /ANTHROPIC|CLAUDE\.AI/, name: 'Claude Pro', category: 'ai-assistant' },
  { re: /AUDIBLE/, name: 'Audible', category: 'books' },
  { re: /KINDLE UNLTD|KINDLE UNLIMITED/, name: 'Kindle Unlimited', category: 'books' },
  // ── gaming ──────────────────────────────────────────────
  { re: /PLAYSTATION|SONY INTERACTIVE|PSN/, name: 'PlayStation Plus', category: 'gaming', yearly: [50, 130] },
  { re: /NINTENDO/, name: 'Nintendo Switch Online', category: 'gaming', yearly: [15, 40] },
  // ── fitness & wellbeing ─────────────────────────────────
  { re: /PUREGYM|PURE GYM/, name: 'PureGym', category: 'fitness' },
  { re: /GYM GROUP/, name: 'The Gym Group', category: 'fitness' },
  { re: /DAVID LLOYD/, name: 'David Lloyd', category: 'fitness' },
  { re: /STRAVA/, name: 'Strava', category: 'fitness', yearly: [40, 70] },
  { re: /PELOTON/, name: 'Peloton', category: 'fitness' },
  { re: /HEADSPACE/, name: 'Headspace', category: 'wellbeing', yearly: [40, 70] },
  { re: /CALM\.COM|^CALM\b/, name: 'Calm', category: 'wellbeing', yearly: [30, 70] },
  { re: /DUOLINGO/, name: 'Duolingo', category: 'education', yearly: [50, 120] },
  { re: /BABBEL/, name: 'Babbel', category: 'education', yearly: [50, 120] },
  // ── dating ──────────────────────────────────────────────
  { re: /HINGE/, name: 'Hinge', category: 'dating' },
  { re: /TINDER/, name: 'Tinder', category: 'dating' },
  { re: /BUMBLE/, name: 'Bumble', category: 'dating' },
  // ── food ────────────────────────────────────────────────
  { re: /PRET.*CLUB|CLUB PRET/, name: 'Club Pret', category: 'other' },
  { re: /CLUBCARD PLUS/, name: 'Tesco Clubcard Plus', category: 'shopping' },
  { re: /DELIVEROO ?PLUS/, name: 'Deliveroo Plus', category: 'food-delivery' },
  { re: /UBER ?ONE/, name: 'Uber One', category: 'food-delivery' },
  { re: /HELLO ?FRESH/, name: 'HelloFresh', category: 'food-box' },
  { re: /GOUSTO/, name: 'Gousto', category: 'food-box' },
  // ── news ────────────────────────────────────────────────
  { re: /TIMES MEDIA|THE TIMES/, name: 'The Times', category: 'news' },
  { re: /GUARDIAN/, name: 'The Guardian', category: 'news' },
  { re: /FINANCIAL TIMES|\bFT\.COM/, name: 'Financial Times', category: 'news' },
  { re: /ECONOMIST/, name: 'The Economist', category: 'news' },
  // ── bills Nous can switch ───────────────────────────────
  { re: /OCTOPUS ENERGY/, name: 'Octopus Energy', category: 'energy' },
  { re: /BRITISH GAS/, name: 'British Gas', category: 'energy' },
  { re: /\bEDF\b/, name: 'EDF', category: 'energy' },
  { re: /\bE\.?ON( NEXT)?\b/, name: 'E.ON Next', category: 'energy' },
  { re: /\bOVO\b/, name: 'OVO', category: 'energy' },
  { re: /SCOTTISHPOWER|SCOTTISH POWER/, name: 'ScottishPower', category: 'energy' },
  { re: /HYPEROPTIC/, name: 'Hyperoptic', category: 'broadband' },
  { re: /COMMUNITY FIBRE/, name: 'Community Fibre', category: 'broadband' },
  { re: /VIRGIN MEDIA/, name: 'Virgin Media', category: 'broadband' },
  { re: /TALKTALK/, name: 'TalkTalk', category: 'broadband' },
  { re: /PLUSNET/, name: 'Plusnet', category: 'broadband' },
  { re: /\bBT GROUP|\bBT\b/, name: 'BT', category: 'broadband' },
  { re: /\bSKY\b|SKY DIGITAL|SKY UK/, name: 'Sky', category: 'tv-package' },
  { re: /TESCO MOBILE/, name: 'Tesco Mobile', category: 'mobile' },
  { re: /\bEE\b|EE LIMITED/, name: 'EE', category: 'mobile' },
  { re: /\bO2\b|TELEFONICA/, name: 'O2', category: 'mobile' },
  { re: /VODAFONE/, name: 'Vodafone', category: 'mobile' },
  { re: /\bTHREE\b|HUTCHISON 3G|^3 MOBILE/, name: 'Three', category: 'mobile' },
  { re: /GIFFGAFF/, name: 'giffgaff', category: 'mobile' },
  { re: /VOXI/, name: 'VOXI', category: 'mobile' },
  { re: /SMARTY/, name: 'SMARTY', category: 'mobile' },
  { re: /LEBARA/, name: 'Lebara', category: 'mobile' },
  { re: /AVIVA/, name: 'Aviva', category: 'insurance', yearly: [150, 900] },
  { re: /DIRECT LINE/, name: 'Direct Line', category: 'insurance', yearly: [150, 900] },
  { re: /ADMIRAL/, name: 'Admiral', category: 'insurance', yearly: [200, 1500] },
  { re: /\bLV\b|LIVERPOOL VICTORIA/, name: 'LV=', category: 'insurance', yearly: [150, 900] },
  { re: /CHURCHILL/, name: 'Churchill', category: 'insurance', yearly: [150, 900] },
  // ── fixed costs ─────────────────────────────────────────
  { re: /\bDVLA\b/, name: 'Vehicle tax', category: 'vehicle-tax' },
  { re: /TV LICENCE|TVLICENSING|TV LICENSING/, name: 'TV Licence', category: 'tv-licence', yearly: [150, 180] },
  { re: /COUNCIL|\bCTAX\b|COUNCIL TAX|^LB [A-Z]+/, name: 'Council tax', category: 'council-tax' },
  { re: /THAMES WATER|YORKSHIRE WATER|UNITED UTILITIES|SEVERN TRENT|ANGLIAN WATER|SOUTHERN WATER|\bWATER\b/, name: 'Water', category: 'water' },
  { re: /MORTGAGE|BUILDING SOC|NATIONWIDE BS|\bBLDG SOC/, name: 'Mortgage', category: 'mortgage' },
  { re: /\bRENT\b/, name: 'Rent', category: 'rent' },
  // ── never subscriptions ─────────────────────────────────
  { re: /TESCO|SAINSBURY|ASDA|LIDL|ALDI|CO-OP|COOP |WAITROSE|MORRISONS|M&S|MARKS ?& ?SPENCER|ICELAND|OCADO/, name: 'Groceries', category: 'groceries' },
  { re: /PRET|GREGGS|COSTA|STARBUCKS|NANDO|MCDONALD|LEON|WAGAMAMA|DELIVEROO|JUST EAT|UBER ?\*?EATS/, name: 'Eating out', category: 'eating-out' },
  { re: /\bTFL\b|TRAINLINE|UBER|BOLT|NATIONAL RAIL|SHELL|BP |ESSO|TEXACO|AVANTI|LNER/, name: 'Transport', category: 'transport' },
  { re: /AMZN ?MKTP|AMAZON\.CO\.UK|AMAZON MARKETPLACE|ARGOS|BOOTS|ZARA|PRIMARK|JOHN LEWIS|ASOS|IKEA|SUPERDRUG|EBAY/, name: 'Shopping', category: 'retail' },
  { re: /SALARY|PAYROLL|WAGES/, name: 'Salary', category: 'salary' },
];

const TRANSFER = /^(STO|SO|FPO|FPI|BGC|TFR|BACS)\b|\b(SO|STO)\b|STANDING ORDER|FASTER PAYMENT|\bTRANSFER\b|\bSAVINGS\b|^TO [A-Z]|^(MR|MRS|MS|MISS|DR) [A-Z]|^[A-Z] [A-Z]{2,}(\s|$)/;
const PROCESSOR_PREFIX = /^(PAYPAL ?\*|PP\*|SQ ?\*|SUMUP ?\*|ZTL\*|CRV\*|IZ ?\*|SP ?\*|CKO\*)\s*/;

/** Turns a raw bank descriptor into a stable comparable form. */
export function cleanDescriptor(raw: string): string {
  let s = raw.toUpperCase().trim();
  s = s.replace(PROCESSOR_PREFIX, '');
  s = s.replace(/\b(DIRECT DEBIT|CARD PAYMENT TO|CARD PAYMENT|CONTACTLESS|VIS|POS|DD)\b/g, ' ');
  s = s.replace(/HTTPS?:\/\//g, '').replace(/\bWWW\./g, '');
  s = s.replace(/\.(COM|CO\.UK|NET|IO|AI|APP)\b/g, ' ');
  s = s.replace(/[*#/]/g, ' ');
  // Refs, phone and store numbers: pure numbers, or codes with 2+ digits (PP4TSUXZV2). Keeps brands like 1PASSWORD, O2, 3G.
  s = s.replace(/\b[A-Z0-9]+\b/g, t => (/^\d+$/.test(t) || (t.match(/\d/g)?.length ?? 0) >= 2 ? ' ' : t));
  s = s.replace(/\b(LTD|LIMITED|PLC|UK|GB|LONDON|INTERNATIONAL|INT|EU|BV|INC|SUBSCR|SUBSCRIPTION|PAYMENT|ON)\b/g, ' ');
  s = s.replace(/[^A-Z0-9& ]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

export const keyOf = (raw: string) => cleanDescriptor(raw).split(' ').slice(0, 3).join(' ') || raw.toUpperCase().trim();

export interface AiLabel { name: string; category: Category; confidence: number; annual?: boolean }
export type AiLabels = Record<string, AiLabel>;

/** Dictionary first, then cached AI labels, then "unknown". Rules always win over AI. */
export function resolveMerchant(raw: string, ai: AiLabels = {}): MerchantInfo {
  const upper = raw.toUpperCase();
  const stripped = upper.replace(PROCESSOR_PREFIX, '');
  const unstarred = stripped.replace(/\*/g, ' ').replace(/\s+/g, ' ').trim();
  for (const e of DICTIONARY) {
    if (e.re.test(stripped) || e.re.test(upper) || e.re.test(unstarred)) {
      return { key: e.name, name: e.name, category: e.category, kind: KIND_OF[e.category], source: 'dictionary', multiProduct: e.multiProduct, yearly: e.yearly, confidence: 1 };
    }
  }
  const key = keyOf(raw);
  if (TRANSFER.test(upper)) {
    return { key: 'TRANSFER ' + key, name: titleCase(key.replace(/^(STO|SO|FPO|FPI|BGC|TFR|BACS|TO)\s+/, '')), category: 'person', kind: 'transfer', source: 'dictionary', confidence: 1 };
  }
  const label = ai[key];
  if (label && label.confidence >= 0.6) {
    return { key, name: label.name, category: label.category, kind: KIND_OF[label.category] ?? 'subscription', source: 'ai', confidence: label.confidence, yearly: label.annual ? [5, 3000] : undefined };
  }
  return { key, name: titleCase(key), category: 'other', kind: 'unknown', source: 'unknown', confidence: 0 };
}

/** Apple and Google bill many products under one name. Price is the only clue; we say "probably". */
export function productHint(m: MerchantInfo, amount: number): { hint: string; category: Category } | undefined {
  if (m.name === 'Apple') {
    const a = Math.round(amount * 100) / 100;
    if (a === 0.99) return { hint: 'probably iCloud+ 50GB', category: 'cloud' };
    if (a === 2.99) return { hint: 'probably iCloud+ 200GB', category: 'cloud' };
    if (a === 8.99) return { hint: 'iCloud+ 2TB or Apple TV+', category: 'other' };
    if (a === 10.99 || a === 11.99) return { hint: 'probably Apple Music', category: 'music' };
    if (a === 18.95 || a === 19.95) return { hint: 'probably Apple One', category: 'other' };
    return { hint: 'an App Store subscription', category: 'other' };
  }
  if (m.name === 'Google Play') return { hint: 'a Google Play subscription', category: 'other' };
  return undefined;
}

export const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
