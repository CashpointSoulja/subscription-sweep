import { composeMessage, type SweepResult } from '../engine';

export function Phone({ result, firstName }: { result: SweepResult; firstName: string }) {
  const { lines, replies } = composeMessage(result, firstName);
  const listStart = lines.findIndex(l => /^1\. /.test(l));
  const intro = listStart > 0 ? lines.slice(0, listStart) : lines.slice(0, 2);
  const list = listStart > 0 ? lines.slice(listStart).filter(l => !/^Want me/.test(l)) : lines.slice(2).filter(l => !/^Want me/.test(l));
  const ask = lines.find(l => /^Want me/.test(l));
  return (
    <div className="phone-wrap">
      <div className="phone" role="img" aria-label="A WhatsApp-style message summarising the sweep">
        <div className="screen">
          <div className="wa-top">
            <div className="wa-avatar"><span /></div>
            <div>
              <div className="wa-name">Nora</div>
              <div className="wa-status">household agent</div>
            </div>
          </div>
          <div className="wa-body">
            <div className="bubble">{intro.map((l, i) => <p key={i}>{l}</p>)}<time>09:41</time></div>
            {list.length > 0 && <div className="bubble">{list.map((l, i) => <p key={i}>{l}</p>)}<time>09:41</time></div>}
            {ask && <div className="bubble"><p>{ask}</p><time>09:41</time></div>}
            {replies.length > 0 && <div className="replies">{replies.map(r => <span key={r}>{r}</span>)}</div>}
          </div>
        </div>
      </div>
      <p className="phone-cap">Concept: how Nora could tell a member. Every number in it comes from the rules, not the model</p>
    </div>
  );
}
