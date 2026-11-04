import { useEffect, useState } from 'react';
import { composeMessage, type SweepResult } from '../engine';
import { useReducedMotion } from '../motion';

/** Nora's message, arriving bubble by bubble with a typing indicator.
 *  Every bubble takes its full space from the start, so nothing below ever moves while it "types". */
export function Phone({ result, firstName }: { result: SweepResult; firstName: string }) {
  const { lines, replies } = composeMessage(result, firstName);
  const listStart = lines.findIndex(l => /^1\. /.test(l));
  const intro = listStart > 0 ? lines.slice(0, listStart) : lines.slice(0, 2);
  const list = listStart > 0 ? lines.slice(listStart).filter(l => !/^Want me/.test(l)) : lines.slice(2).filter(l => !/^Want me/.test(l));
  const ask = lines.find(l => /^Want me/.test(l));
  const bubbles = [intro, list, ask ? [ask] : []].filter(b => b.length);
  const total = bubbles.length + (replies.length ? 1 : 0);

  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? total * 2 : 0); // even = typing bubble k/2, odd = bubble shown
  useEffect(() => {
    if (reduced) { setStep(total * 2); return; }
    const timers: number[] = [];
    let t = 200;
    for (let k = 0; k < total * 2; k++) {
      // step k+1: odd = start typing bubble, even = show it. Typing lasts ~0.45 s, the gap before the next is short.
      t += k % 2 === 0 ? (k === 0 ? 0 : 160) : 450;
      timers.push(window.setTimeout(() => setStep(k + 1), t));
    }
    return () => timers.forEach(clearTimeout);
  }, [reduced, total]);
  const state = (k: number) => (step > k * 2 + 1 ? 'shown' : step === k * 2 + 1 ? 'typing' : 'waiting');

  return (
    <div className="phone-wrap">
      <div className="phone" role="img" aria-label={`A WhatsApp-style message from Nora: ${lines.join(' ')}`}>
        <div className="screen">
          <div className="wa-top">
            <div className="wa-avatar"><span /></div>
            <div>
              <div className="wa-name">Nora</div>
              <div className="wa-status">{step < bubbles.length * 2 ? 'typing…' : 'household agent'}</div>
            </div>
          </div>
          <div className="wa-body" aria-hidden="true">
            {bubbles.map((b, k) => (
              <div key={k} className={`bubble ${state(k)}`}>{b.map((l, i) => <p key={i}>{l}</p>)}<time>09:41</time></div>
            ))}
            {replies.length > 0 && <div className={`replies ${state(bubbles.length)}`}>{replies.map((r, i) => <span key={r} style={{ ['--i' as string]: i }}>{r}</span>)}</div>}
          </div>
        </div>
      </div>
      <p className="phone-cap">Concept: how Nora could tell a member. Every number in it comes from the rules, not the model</p>
    </div>
  );
}
