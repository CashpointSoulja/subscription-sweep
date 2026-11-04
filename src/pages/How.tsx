import { AI_LABELS } from '../data';

type Label = { name: string; category: string; confidence: number; annual?: boolean; descriptor?: string; model?: string };

export function How() {
  const all = Object.entries(AI_LABELS as unknown as Record<string, Label>);
  // Show the interesting ones: subscriptions, yearly plans and the ones it refused to name.
  const pick = (re: RegExp) => all.filter(([k]) => re.test(k));
  const labels = [...pick(/ROBLOX|BREAD CLUB|CRUNCHYROLL|PATREON|KLX|VLXSERV|FMX|ENGLISH HERITAGE|1PASSWORD|NORTON|RAC MOTOR|SIMPLYCOOK|SHELTER|FUTURE PUB/)];
  const sent = labels.slice(0, 6).map(([key, l]) => ({ key, descriptor: l.descriptor ?? key }));
  return (
    <div className="wrap">
      <div className="prose" style={{ maxWidth: 960 }}>
        <h1>How it works</h1>
        <p className="secondary" style={{ fontSize: 18, lineHeight: '28px', maxWidth: '40rem' }}>Five steps. Four are plain rules. One uses AI, for the one job rules are bad at: knowing that "ROBLOX CORPORATION" is a game and "SQ *THE BREAD CLUB" is a bakery subscription.</p>
      </div>
      <div className="pipeline">
        <div className="step"><span className="n">1 · rules</span><b>Read the file</b><span>Finds the date, description and amount columns in any bank's export. Day-first dates, £ signs, split in/out columns</span></div>
        <div className="step ai"><span className="n">2 · dictionary, then AI</span><b>Name the merchant</b><span>~110 rules cover the big names. Anything left goes to the AI, as text only</span></div>
        <div className="step"><span className="n">3 · rules</span><b>Find repeats</b><span>Groups by merchant and price, then checks the gaps: weekly, monthly, quarterly, yearly, allowing skipped cycles</span></div>
        <div className="step"><span className="n">4 · rules</span><b>Prices and dates</b><span>Current price, price changes, next charge, yearly cost, still active or stopped</span></div>
        <div className="step"><span className="n">5 · rules</span><b>Flags and message</b><span>Eight flags, a total that counts each payment once, and a message built from those numbers</span></div>
      </div>
      <div className="prose" style={{ maxWidth: 760, paddingTop: 16 }}>
        <div className="callout"><b>The hand-over rule.</b> The AI can only say what a merchant is: a name, a category, and whether it's usually paid yearly. It can't add a payment, change an amount, move a date or raise a flag. If it's less than 60% sure, its answer is thrown away and the payment shows as "can't name this one", which is itself a flag: an unnamed repeat payment is the classic forgotten subscription.</div>

        <h2>What the AI actually sees</h2>
        <p>Only the merchant text the dictionary didn't recognise. No amounts, no dates, no names, nothing that identifies the person. The first six of the {all.length} sent for the sample and blind-test households:</p>
        <pre><code>{JSON.stringify(sent, null, 1)}</code></pre>

        <h2>What it said back</h2>
        <table>
          <thead><tr><th>Bank text</th><th>Named as</th><th>Category</th><th>Yearly plan</th><th>Sure</th><th>Used</th></tr></thead>
          <tbody>
            {labels.map(([k, l]) => (
              <tr key={k}><td className="mono" style={{ fontSize: 13 }}>{l.descriptor ?? k}</td><td>{l.name}</td><td>{l.category}</td><td>{l.annual ? 'usually' : ''}</td><td className="num">{Math.round(l.confidence * 100)}%</td><td>{l.confidence >= 0.6 ? 'yes' : 'no, stays unnamed'}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 14 }}>A sample of {labels.length} of {all.length} labels: the subscriptions, the yearly plans and the three it refused to name. Model: Claude Haiku, called from a build script. The browser never calls a model. Results are cached, so each merchant is labelled once.</p>

        <h2>Why the reason line isn't AI-written</h2>
        <p>My first plan had the model write the one-line reason for each flag. I cut it. The reason is exactly where a wrong number sneaks in: "Netflix went up £3" when it went up £2. So reasons are templates filled in by the rules. The model's output never reaches a sentence with a £ in it.</p>

        <h2>Where each part runs</h2>
        <table>
          <thead><tr><th>Part</th><th>In this prototype</th><th>At Nous, I'd expect</th></tr></thead>
          <tbody>
            <tr><td>Reading the statement</td><td>In the browser tab</td><td>Open Banking feed, no file at all</td></tr>
            <tr><td>Rules</td><td>In the browser, about a second for 12 months</td><td>Same code, server-side, on each new transaction</td></tr>
            <tr><td>AI naming</td><td>Offline script, cached to a JSON file</td><td>Cached per merchant across all members: one label serves every household that pays that merchant</td></tr>
            <tr><td>The message</td><td>Mock WhatsApp bubble</td><td>Nora, with a human-readable reason and a one-tap "cancel this"</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
