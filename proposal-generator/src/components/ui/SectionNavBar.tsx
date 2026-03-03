'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SectionVisibility } from '@/types/proposal';

interface SectionNavBarProps {
  sectionVisibility: SectionVisibility;
  documentRef: React.RefObject<HTMLDivElement | null>;
}

const NAV_SECTIONS: { key: keyof SectionVisibility; label: string }[] = [
  { key: 'executiveSummary', label: 'Executive Summary' },
  { key: 'meetHarper', label: 'The Solution' },
  { key: 'investmentCase', label: 'Investment Case' },
  { key: 'securityIntegration', label: 'Security & Integration' },
  { key: 'whyNow', label: 'Why Now' },
  { key: 'nextSteps', label: 'Next Steps' },
];

export function SectionNavBar({ sectionVisibility, documentRef }: SectionNavBarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [leftPos, setLeftPos] = useState<number | null>(null);
  const ratiosRef = useRef(new Map<string, number>());

  const visibleSections = NAV_SECTIONS.filter(s => sectionVisibility[s.key]);

  // Dynamically compute left position from the document element's actual position
  useEffect(() => {
    const container = documentRef.current;
    if (!container) return;

    const updatePosition = () => {
      const rect = container.getBoundingClientRect();
      const newLeft = rect.left - 36;
      // Only show if there's enough space (at least 20px from viewport edge)
      setLeftPos(newLeft >= 20 ? newLeft : null);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [documentRef]);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const container = documentRef.current;
    if (!container) return;

    const sectionElements = visibleSections
      .map(s => container.querySelector(`[data-section-key="${s.key}"]`))
      .filter(Boolean) as Element[];

    if (sectionElements.length === 0) return;

    ratiosRef.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const key = (entry.target as HTMLElement).dataset.sectionKey;
          if (key) ratiosRef.current.set(key, entry.intersectionRatio);
        });

        let maxKey = '';
        let maxRatio = 0;
        ratiosRef.current.forEach((ratio, key) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            maxKey = key;
          }
        });

        if (maxKey) setActiveSection(maxKey);
      },
      {
        threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '-5% 0px -5% 0px',
      }
    );

    sectionElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSections.map(s => s.key).join(','), documentRef]);

  const scrollToSection = useCallback((key: string) => {
    const el = documentRef.current?.querySelector(`[data-section-key="${key}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [documentRef]);

  if (visibleSections.length === 0 || leftPos === null) return null;

  return (
    <div
      className="fixed print:hidden z-40 flex flex-col"
      style={{
        left: `${leftPos}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        gap: '3px',
      }}
    >
      {visibleSections.map(section => {
        const isActive = activeSection === section.key;
        return (
          <button
            key={section.key}
            onClick={() => scrollToSection(section.key)}
            className="w-2 rounded-sm transition-all duration-300 relative group cursor-pointer hover:w-2.5"
            style={{
              height: '44px',
              backgroundColor: isActive
                ? 'rgba(3, 20, 59, 0.8)'
                : 'rgba(3, 20, 59, 0.12)',
              boxShadow: isActive ? '0 0 10px rgba(3, 20, 59, 0.25)' : 'none',
            }}
          >
            <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#03143B] text-white text-xs font-medium px-2.5 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              {section.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
