'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 (or previous value) to the target value
 * when the element comes into view.
 */
export function useAnimatedCounter(
  target: number,
  duration = 1200,
  decimals = 0
) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);
  const prevTarget = useRef(target);

  // Re-animate when target changes (scenario toggle)
  useEffect(() => {
    if (prevTarget.current !== target && hasAnimated.current) {
      animateValue(value, target, duration);
      prevTarget.current = target;
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial animation on scroll into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateValue(0, target, duration);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function animateValue(from: number, to: number, dur: number) {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / dur, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setValue(to);
      }
    };
    requestAnimationFrame(step);
  }

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return { ref, display, value };
}
