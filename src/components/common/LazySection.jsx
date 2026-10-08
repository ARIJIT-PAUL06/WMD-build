import React, { useRef } from 'react';
import useInView from '../../hooks/useInView';

/**
 * Mounts `children` only once the placeholder is within `rootMargin` of the viewport.
 * Pair with React.lazy children so the chunk is also fetched on approach, not at page load.
 * The placeholder reserves `minHeight` so scroll position and anchors stay stable.
 */
export default function LazySection({ children, minHeight = '100vh', rootMargin = '1200px 0px', id }) {
  const ref = useRef(null);
  const near = useInView(ref, { rootMargin, once: true });

  if (near) {
    return <React.Suspense fallback={<div style={{ minHeight }} />}>{children}</React.Suspense>;
  }
  return <div ref={ref} id={id} style={{ minHeight }} aria-hidden="true" />;
}
