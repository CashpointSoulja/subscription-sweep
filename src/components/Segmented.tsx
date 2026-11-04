import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface SegItem { id: string; label: string; href: string; className?: string }

/** Links styled as a segmented control. A pill slides to the current item instead of the highlight jumping.
 *  Left/right arrow keys move between items. On narrow screens it scrolls sideways rather than wrapping. */
export function Segmented({ items, current, label, className = 'seg', keys = true }: { items: SegItem[]; current: string | undefined; label: string; className?: string; keys?: boolean }) {
  const nav = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number; on: boolean; instant: boolean }>({ x: 0, w: 0, on: false, instant: true });
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    // No current item visible (a hidden link on phones): collapse the pill to nothing at the start,
    // so an invisible pill can't sit past the edge of a narrow screen and cause sideways scroll.
    if (!el || el.offsetWidth === 0) { setPill({ x: 0, w: 0, on: false, instant: true }); return; }
    // Coming back from hidden, appear in place rather than sliding in from the left.
    setPill(p => ({ x: el.offsetLeft, w: el.offsetWidth, on: true, instant: !p.on }));
  }, []);

  useLayoutEffect(measure, [current, measure]);
  useEffect(() => {
    // Turn the slide on only after the first paint, so the pill doesn't fly in from the left on load.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    const ro = new ResizeObserver(measure);
    if (nav.current) ro.observe(nav.current);
    document.fonts?.ready.then(measure);
    return () => { cancelAnimationFrame(id); ro.disconnect(); };
  }, [measure]);

  // On a phone the bar can be wider than the screen: keep the current item in view, without scrolling the page.
  useEffect(() => {
    const n = nav.current, el = n?.querySelector<HTMLElement>('[aria-current="page"]');
    if (n && el && n.scrollWidth > n.clientWidth + 1) n.scrollTo({ left: el.offsetLeft - (n.clientWidth - el.offsetWidth) / 2, behavior: ready ? 'smooth' : 'auto' });
  }, [current, ready]);

  const onKey = (e: KeyboardEvent) => {
    if (!keys || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const i = Math.max(0, items.findIndex(x => x.id === current));
    const next = items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
    e.preventDefault();
    location.hash = next.href.replace(/^#/, '');
    requestAnimationFrame(() => nav.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus());
  };

  return (
    <nav ref={nav} className={`${className} seg-slide`} aria-label={label} onKeyDown={onKey}>
      <span className={`seg-pill${ready && !pill.instant ? ' anim' : ''}${pill.on ? '' : ' off'}`} style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} aria-hidden="true" />
      {items.map(x => (
        <a key={x.id} data-id={x.id} href={x.href} className={x.className} aria-current={x.id === current ? 'page' : undefined}>{x.label}</a>
      ))}
    </nav>
  );
}
