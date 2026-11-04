import { marked } from 'marked';
import { useMemo } from 'react';

// Only the public docs. Never glob docs/*.md: that would ship private working notes in the site's code.
const files = import.meta.glob(['../../docs/memo.md', '../../docs/PRD.md', '../../docs/build-log.md'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const DOCS: { id: string; title: string }[] = [
  { id: 'memo', title: 'One-page memo' },
  { id: 'PRD', title: 'PRD' },
  { id: 'build-log', title: 'Build log' },
];

export function Doc({ id }: { id: string }) {
  const md = files[`../../docs/${id}.md`] ?? '# Not found';
  // Screenshots live in public/shots so they work both on GitHub (relative path) and in the app.
  const html = useMemo(() => marked.parse(md.replace(/\.\.\/public\/shots\//g, 'shots/'), { async: false }) as string, [md]);
  return (
    <div className="wrap">
      <nav className="seg doc-tabs" aria-label="Documents">
        {DOCS.map(d => <a key={d.id} href={`#/docs/${d.id}`} aria-current={d.id === id ? 'page' : undefined}>{d.title}</a>)}
      </nav>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
