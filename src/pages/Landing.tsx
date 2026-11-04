import { ArrowRight, Bot, Ruler } from 'lucide-react';
import { FLAG_ICON } from '../components/FlagCard';
import { Statement } from '../components/Statement';
import { Upload, type OnFiles } from '../components/Upload';
import { HOUSEHOLDS, owner, sweepHousehold } from '../data';
import { gbp, gbp0, type Flag } from '../engine';
import { Reveal } from '../motion';

const CATCHES: { type: Flag['type']; name: string; rule: string }[] = [
  { type: 'duplicate', name: 'Two services doing one job', rule: 'Two music apps, two cloud plans, two AI assistants, or the same service paid twice' },
  { type: 'price-rise', name: 'Prices that crept up', rule: 'Same service, higher price. Only the increase counts towards your total' },
  { type: 'trial-converted', name: 'Trials that became bills', rule: 'A £0 to £2 charge, then full price a few days later' },
  { type: 'renewal-soon', name: 'Annual plans about to renew', rule: 'Yearly charges due in the next 30 days, while you can still decide' },
  { type: 'double-charge', name: 'Charged twice', rule: 'Two charges in one cycle with no refund. Money to ask back' },
  { type: 'stack', name: 'Streaming stacks', rule: 'Three or more TV and film services at once. Most people rotate' },
  { type: 'unknown', name: 'Payments nobody can name', rule: "A repeat payment neither the rules nor the AI can identify. Check it" },
  { type: 'new', name: 'New this month', rule: 'Started in the last 45 days. Worth a second look' },
];

export function Landing({ onFiles }: { onFiles: OnFiles }) {
  const all = HOUSEHOLDS.map(h => ({ h, ...sweepHousehold(h.id) }));
  const example = (t: Flag['type']) => {
    const f = all.flatMap(x => x.result.flags).find(f => f.type === t);
    if (!f) return undefined;
    return t === 'unknown' ? f.detail.split(' since')[0] : t === 'stack' ? f.detail.split(':')[0] : f.title;
  };
  return (
    <>
      <div className="wrap">
        <section className="hero">
          <div className="fade-in">
            <p className="kicker"><span className="dot" />A concept for Nous, built by Ayo Ahmed</p>
            <h1>Find what you forgot you're paying for</h1>
            <p className="sub">Drop in a bank statement. Sweep finds every subscription, what it costs you a year, and the ones worth a look: two music apps, a price that crept up, a free trial that quietly became £24.99 a month.</p>
            <div className="actions">
              <a className="btn btn-primary" href="#/sweep/priya">See a sample sweep <ArrowRight size={16} strokeWidth={1.5} /></a>
              <button className="btn btn-secondary" onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })}>Use my statement</button>
            </div>
          </div>
          <Statement />
        </section>

        <Reveal as="section" className="section">
          <div className="section-head">
            <h2>Eight things worth a look</h2>
            <p>Each one is a fixed rule you can read, not a guess. Examples below are the real output on the sample households.</p>
          </div>
          <div className="catch-list">
            {CATCHES.map(c => {
              const Icon = FLAG_ICON[c.type];
              const eg = example(c.type);
              return (
                <div className="catch" key={c.type}>
                  <Icon size={18} strokeWidth={1.5} aria-hidden />
                  <h3>{c.name}</h3>
                  <p>{c.rule}</p>
                  {eg && <div className="eg">e.g. {eg}</div>}
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal as="section" className="section">
          <div className="section-head">
            <h2>Three households, swept</h2>
            <p>Made-up people, realistic bank files: a Monzo export, a Nationwide export and a Starling export, 12 months each.</p>
          </div>
          <div className="households">
            {all.map(({ h, result, txns }) => (
              <a className="hh" key={h.id} href={`#/sweep/${h.id}`}>
                <div className="who">{owner(h)}</div>
                <div className="blurb">{h.blurb}</div>
                <div>
                  <div className="fig">{gbp0(result.totals.worthALookAnnual)}</div>
                  <div className="fig-label">a year worth a look{result.totals.toClaimBack > 0 && <> · {gbp(result.totals.toClaimBack)} to claim back</>}</div>
                </div>
                <div className="fig-label mono">{txns.length} payments · {result.flags.length} flags</div>
                <div className="go">Open the sweep <ArrowRight size={14} strokeWidth={1.5} /></div>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="section">
          <div className="section-head">
            <h2>Rules own the money. AI only names things</h2>
            <p>A wrong label is annoying. A wrong £ figure costs someone money. So the model never touches an amount, a date or a total.</p>
          </div>
          <div className="split">
            <div className="lane">
              <h3><Ruler size={18} strokeWidth={1.5} className="muted" /> Rules</h3>
              <p>Plain code you can read and test</p>
              <ol>
                <li>Read the bank file, whichever bank it's from</li>
                <li>Find payments that repeat weekly, monthly, quarterly or yearly</li>
                <li>Work out prices, price changes, next charge dates and yearly costs</li>
                <li>Raise the eight flags and add up what's worth a look, counting each payment once</li>
                <li>Write the message. Every number in it comes from steps 1 to 4</li>
              </ol>
            </div>
            <div className="lane">
              <h3><Bot size={18} strokeWidth={1.5} className="muted" /> AI</h3>
              <p>One small job, checked by the rules</p>
              <ol>
                <li>Gets only the bank text the dictionary doesn't recognise, like "ROBLOX CORPORATION". No amounts, no dates, nothing personal</li>
                <li>Returns a name, a category, whether it's usually a yearly plan, and how sure it is</li>
                <li>Under 60% sure, it stays "can't name this one" and the member is asked to check it</li>
              </ol>
              <p style={{ marginTop: 16, marginBottom: 0 }}><a href="#/how" className="secondary">How it works, with the real AI output <ArrowRight size={12} strokeWidth={1.5} /></a></p>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="section" id="upload">
          <div className="section-head">
            <h2>Try your own statement</h2>
            <p>Export a CSV from your banking app and drop it in. It's read in this tab and never leaves your device. Close the tab and it's gone.</p>
          </div>
          <Upload onFiles={onFiles} />
        </Reveal>
      </div>
    </>
  );
}
