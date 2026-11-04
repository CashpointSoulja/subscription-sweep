const DAY = 86_400_000;

export const toDay = (iso: string): number => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY;
export const fromDay = (d: number): string => new Date(d * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string): number => toDay(b) - toDay(a);
export const addDays = (iso: string, n: number): string => fromDay(toDay(iso) + n);

/** Same day next month(s), clamped to month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, n: number): string {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1, d = +iso.slice(8, 10);
  const target = new Date(Date.UTC(y, m + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');

/** Parses UK bank date formats. Returns YYYY-MM-DD or null. Day-first, never US month-first. */
export function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/^"|"$/g, '');
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);                       // 2026-10-31 / ISO with time
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);             // 31/10/2026, 31-10-26
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const mo = +m[2], d = +m[1];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,4})[a-z]*\s+(\d{2,4})/);      // 31 Oct 2026
  if (m && MONTHS[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return `${y}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(+m[1])}`;
  }
  return null;
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(toDay(iso) * DAY).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });
