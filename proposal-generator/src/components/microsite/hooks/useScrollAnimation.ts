'use client';

import { useEffect, useRef } from 'react';

/**
 * Adds a CSS class when the element scrolls into view.
 * Uses IntersectionObserver with a threshold.
 */
export function useScrollAnimation<T extends HTMLElement>(
  threshold = 0.15
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('ms-visible');
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
