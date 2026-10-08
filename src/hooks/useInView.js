import { useEffect, useState } from 'react';

/**
 * Tracks whether the element behind `ref` is near the viewport.
 * `rootMargin` lets heavy sections start a little before they scroll into view.
 * With `once: true` it latches to true after the first intersection (for lazy mounting).
 */
export default function useInView(ref, { rootMargin = '0px', once = false } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[entries.length - 1].isIntersecting;
        if (visible) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, once]);

  return inView;
}
