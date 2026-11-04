import { useEffect, useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia(QUERY).matches;

/** True when the member has asked their device for less motion. Every animation checks this. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const m = matchMedia(QUERY);
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** A number that rolls from its last value to the new one. Screen readers get the final value only. */
export function Num({ value, format, duration = 600 }: { value: number; format: (n: number) => string; duration?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { from.current = value; setShown(value); return; }
    const a = from.current, b = value, t0 = performance.now();
    if (a === b) return;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const v = p >= 1 ? b : a + (b - a) * easeOut(p);
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, duration]);
  return <><span className="sr-only">{format(value)}</span><span aria-hidden="true">{format(shown)}</span></>;
}

/** Fades a block in when it scrolls into view. Only blocks that start below the fold are ever hidden,
 *  so nothing above the fold flickers and nothing stays invisible if the observer never fires. */
export function Reveal({ as: Tag = 'div', className = '', children, id }: { as?: ElementType; className?: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'shown' | 'waiting' | 'in'>('shown');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    if (el.getBoundingClientRect().top < innerHeight * 0.92) return;
    setState('waiting');
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setState('in'); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} id={id} className={`${className} reveal-${state}`.trim()}>{children}</Tag>;
}
