import main from '../data/eval-results.json';
import rulesOnly from '../data/eval-results-rules-only.json';

const evals = import.meta.glob('../data/eval-results-holdout*.json', { eager: true, import: 'default' }) as Record<string, Eval>;
const blind1 = evals['../data/eval-results-holdout-first-run.json'];
const fixed1 = evals['../data/eval-results-holdout.json'];
const blind2 = evals['../data/eval-results-holdout2-first-run.json'];
const fixed2 = evals['../data/eval-results-holdout2.json'];

type Score = { tp: number; fp: number; fn: number; precision?: number; recall?: number; missed?: string[]; extra?: string[] };
interface HouseholdEval { id: string; name: string; format: string; txns: number; subs: Score; bills: Score; flags: Score; exact: number; matched: number; ai: { ok: number; total: number }; worthALook: number }
interface Eval { runAt: string; mode: string; households: HouseholdEval[]; overall: { txns: number; streams: number; subscriptions: Score; bills: Score; flags: Score; exactPrice: { ok: number; total: number }; aiLabels: { ok: number; total: number } } }

const M = main as unknown as Eval, R = rulesOnly as unknown as Eval;
const pct = (n?: number) => `${n ?? 0}%`;

function Kpis({ e }: { e: Eval }) {
  const o = e.overall;
  return (
    <div className="kpis">
      <div className="kpi"><div className="label">Subscriptions found</div><div className="value">{o.subscriptions.tp}/{o.subscriptions.tp + o.subscriptions.fn}</div><div className="sub">{o.subscriptions.fp} false alarm{o.subscriptions.fp === 1 ? '' : 's'}</div></div>
      <div className="kpi"><div className="label">Bills and fixed costs</div><div className="value">{o.bills.tp}/{o.bills.tp + o.bills.fn}</div><div className="sub">{o.bills.fp} false alarm{o.bills.fp === 1 ? '' : 's'}</div></div>
      <div className="kpi"><div className="label">Flags right</div><div className="value">{o.flags.tp}/{o.flags.tp + o.flags.fn}</div><div className="sub">{o.flags.fp} extra · precision {pct(o.flags.precision)}</div></div>
      <div className="kpi"><div className="label">Exact price and frequency</div><div className="value">{o.exactPrice.ok}/{o.exactPrice.total}</div><div className="sub">AI names {o.aiLabels.ok}/{o.aiLabels.total}</div></div>
    </div>
  );
}

function Table({ e }: { e: Eval }) {
  return (
    <table>
      <thead><tr><th>Household</th><th>Format</th><th className="r">Payments</th><th className="r">Subs found</th><th className="r">Bills found</th><th className="r">Flags right</th><th>Missed or extra</th></tr></thead>
      <tbody>
        {e.households.map(h => (
          <tr key={h.id}>
            <td>{h.name}</td><td className="secondary">{h.format}</td><td className="r num">{h.txns}</td>
            <td className="r num">{h.subs.tp}/{h.subs.tp + h.subs.fn}{h.subs.fp ? ` +${h.subs.fp}` : ''}</td>
            <td className="r num">{h.bills.tp}/{h.bills.tp + h.bills.fn}{h.bills.fp ? ` +${h.bills.fp}` : ''}</td>
            <td className="r num">{h.flags.tp}/{h.flags.tp + h.flags.fn}{h.flags.fp ? ` +${h.flags.fp}` : ''}</td>
            <td className="secondary" style={{ whiteSpace: 'normal', fontSize: 13 }}>{[...(h.subs.missed ?? []).map(x => `missed ${x}`), ...(h.subs.extra ?? []).map(x => `extra ${x}`), ...(h.bills.missed ?? []).map(x => `missed ${x}`), ...(h.bills.extra ?? []).map(x => `extra ${x}`), ...(h.flags.missed ?? []).map(x => `missed flag ${x}`), ...(h.flags.extra ?? []).map(x => `extra flag ${x}`)].join(' · ') || 'none'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Accuracy() {
  return (
    <div className="wrap">
      <div className="prose" style={{ maxWidth: 960 }}>
        <h1>How accurate is it</h1>
        <p className="secondary" style={{ fontSize: 18, lineHeight: '28px', maxWidth: '42rem' }}>Every change gets scored against an answer key: which payments really are subscriptions, what they cost, and which flags should fire. Run it with <code>npm run eval</code>.</p>

        <h2>Sample households</h2>
        <p>{M.overall.txns.toLocaleString('en-GB')} payments across 3 households, {M.overall.streams} labelled repeat payments and the traps I planted: a weekly food shop, the same coffee most days, money to a flatmate, a refunded double charge, switching gyms.</p>
      </div>
      <Kpis e={M} />
      <div className="prose" style={{ maxWidth: 1100, padding: 0 }}><Table e={M} /></div>

      <div className="prose" style={{ maxWidth: 760, paddingTop: 0 }}>
        <div className="callout"><b>Read this before trusting the 100%.</b> I wrote these households and I wrote the rules. A perfect score mostly proves the rules do what I meant. The blind test below is the honest number.</div>

        <h2>What the AI step adds</h2>
        <p>Same households, AI labels switched off. Flags drop from {M.overall.flags.precision}% to {R.overall.flags.precision}% precision: {R.overall.flags.fp} extra "can't name this one" flags on payments a person would recognise instantly (Roblox, Patreon, Crunchyroll, a bakery subscription). Detection is the same either way, because the rules find the repeats. The AI only makes them readable.</p>
        <table>
          <thead><tr><th></th><th className="r">Rules only</th><th className="r">Rules + AI</th></tr></thead>
          <tbody>
            <tr><td>Flag precision</td><td className="r num">{pct(R.overall.flags.precision)}</td><td className="r num">{pct(M.overall.flags.precision)}</td></tr>
            <tr><td>False flags</td><td className="r num">{R.overall.flags.fp}</td><td className="r num">{M.overall.flags.fp}</td></tr>
            <tr><td>Subscriptions found</td><td className="r num">{R.overall.subscriptions.tp}/{R.overall.subscriptions.tp + R.overall.subscriptions.fn}</td><td className="r num">{M.overall.subscriptions.tp}/{M.overall.subscriptions.tp + M.overall.subscriptions.fn}</td></tr>
            <tr><td>Payments correctly named by AI</td><td className="r num">0/{M.overall.aiLabels.total}</td><td className="r num">{M.overall.aiLabels.ok}/{M.overall.aiLabels.total}</td></tr>
          </tbody>
        </table>

        <h2>Blind test</h2>
        <p>Two more households written by a separate agent that never saw the code, with its own answer key and about 40 traps: Netflix under four different names, a file sorted newest first, Tesco six different ways, seasonal energy bills, a part-month first gym payment, yearly memberships from merchants nobody's dictionary has. This is the number to judge it by.</p>
      </div>
      {blind1 && (
        <div className="prose" style={{ maxWidth: 1100, padding: 0 }}>
          <table>
            <thead><tr><th></th><th className="r">Subscriptions found</th><th className="r">False alarms</th><th className="r">Bills found</th><th className="r">Flags right</th><th className="r">Extra flags</th><th className="r">Exact £</th></tr></thead>
            <tbody>
              {[{ label: 'Set 1, first run (blind)', e: blind1 }, ...(fixed1 ? [{ label: 'Set 1 after fixes (not blind)', e: fixed1 }] : []), ...(blind2 ? [{ label: 'Set 2, first run (blind, written after the set 1 fixes)', e: blind2 }] : []), ...(fixed2 && blind2 ? [{ label: 'Set 2 after fixes (not blind)', e: fixed2 }] : [])].map(({ label, e }) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="r num">{e.overall.subscriptions.tp}/{e.overall.subscriptions.tp + e.overall.subscriptions.fn}</td>
                  <td className="r num">{e.overall.subscriptions.fp}</td>
                  <td className="r num">{e.overall.bills.tp}/{e.overall.bills.tp + e.overall.bills.fn}</td>
                  <td className="r num">{e.overall.flags.tp}/{e.overall.flags.tp + e.overall.flags.fn}</td>
                  <td className="r num">{e.overall.flags.fp}</td>
                  <td className="r num">{e.overall.exactPrice.ok}/{e.overall.exactPrice.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="prose" style={{ maxWidth: 760, paddingTop: 8 }}>
        <h3>What the blind test caught</h3>
        <ul>
          <li><b>Real bugs.</b> "UBER *ONE": the asterisk broke the match, so it was filed as a taxi. A quarterly magazine's price rise was split in two because I only joined price levels up to 40 days apart. Seasonal energy bills split into several "bills". A part-month first gym payment looked like a price rise. Standing orders to savings and a friend's 5-a-side money looked like subscriptions. A rule meant to strip reference codes also deleted "1Password".</li>
          <li><b>A gap in the AI's job.</b> Yearly plans from merchants the dictionary doesn't know (English Heritage, Norton, RAC) were invisible: one charge isn't a pattern. Fix: the AI now also says whether a merchant is usually paid yearly. That's a fact about the merchant, not the amount, so it stays inside the hand-over rule.</li>
          <li><b>My scorer was unfair.</b> It marked flags wrong when the engine and the key used different names ("LV=" vs "Liverpool Victoria"). About 5 of the first run's misses were this. Fixed in the scorer, not the engine, and the first-run row above is left exactly as it was recorded.</li>
          <li><b>One disagreement I'm keeping.</b> The key calls a couple's two phone lines a duplicate. Two people, two phones. My rule doesn't flag bills as duplicates, so that stays a miss.</li>
        </ul>
        {blind2 ? (
          <>
            <h3>Did the fixes generalise?</h3>
            <p>Partly. A second agent wrote two new households after the set 1 fixes, again without seeing the code. On its first run, flags went from under half right to about three quarters, bills and subscriptions found went up, and every price was still exact. But false alarms went up: card repayments, a car loan, Klarna, cash withdrawals and a 20p foreign-transaction fee all counted as subscriptions, and Santander's "…RATE 1.35/GBP" made Perplexity look like a BP petrol station. After fixing those: 25/25 and 22/22, with one miss I'm leaving: Apple TV+ hidden inside an Apple bill at a price my hints don't know.</p>
            <p>Re-labelling also showed the AI can change its mind between runs (a small bakery went from 70% sure to 30%). So labels are now stable: a refresh never replaces a confident label with an unsure one.</p>
          </>
        ) : <p className="muted">A second blind set, written after these fixes by another agent that can't see the code, is being scored.</p>}
      </div>
      {blind2 && <><div className="prose" style={{ maxWidth: 760, padding: 0 }}><h3>Set 2, first run, per household</h3></div><div className="prose" style={{ maxWidth: 1100, padding: 0 }}><Table e={blind2} /></div></>}
      <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>Last scored {new Date(M.runAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    </div>
  );
}
