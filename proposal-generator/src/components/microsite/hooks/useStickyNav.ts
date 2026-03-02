'use client';

import { useEffect, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

/**
 * Tracks which section is active and whether the nav should be visible.
 * Nav becomes visible after scrolling past the cover section.
 */
export function useStickyNav(sections: NavSection[]) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav after scrolling past viewport height (cover)
      setIsVisible(window.scrollY > window.innerHeight * 0.5);

      // Find which section is active
      let current = sections[0]?.id || '';
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            current = section.id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return { activeSection, isVisible, scrollTo };
}
