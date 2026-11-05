import { marked } from 'marked';
import { useMemo } from 'react';
import { Segmented } from '../components/Segmented';
import { DOCS } from '../docs';

// Only the public docs. Never glob docs/*.md: that would ship private working notes in the site's code.
const files = import.meta.glob(['../../docs/memo.md', '../../docs/PRD.md', '../../docs/build-log.md', '../../docs/gtm.md'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;


export function Doc({ id }: { id: string }) {
  const md = files[`../../docs/${id}.md`] ?? '# Not found';
  // Screenshots live in public/shots so they work both on GitHub (relative path) and in the app.
  const html = useMemo(() => marked.parse(md.replace(/\.\.\/public\/shots\//g, 'shots/'), { async: false }) as string, [md]);
  return (
    <div className="wrap">
      <div className="doc-tabs"><Segmented items={DOCS.map(d => ({ id: d.id, label: d.title, href: `#/docs/${d.id}` }))} current={id} label="Documents" /></div>
      <article className="prose swap-in" key={id} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
