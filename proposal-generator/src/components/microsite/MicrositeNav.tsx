'use client';

import React from 'react';
import { useStickyNav, NavSection } from './hooks/useStickyNav';

const SECTIONS: NavSection[] = [
  { id: 'vision', label: 'Vision' },
  { id: 'executive-summary', label: 'Summary' },
  { id: 'harper', label: 'Harper' },
  { id: 'value-drivers', label: 'Value' },
  { id: 'investment', label: 'Investment' },
  { id: 'roi-explorer', label: 'ROI' },
  { id: 'security', label: 'Security' },
  { id: 'why-now', label: 'Next Steps' },
];

interface MicrositeNavProps {
  customerLogoBase64?: string;
}

export function MicrositeNav({ customerLogoBase64 }: MicrositeNavProps) {
  const { activeSection, isVisible, scrollTo } = useStickyNav(SECTIONS);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 ms-nav ${
        isVisible ? 'ms-nav-visible' : 'ms-nav-hidden'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-12 gap-1 overflow-x-auto">
          <div className="flex items-center gap-2 mr-4 flex-shrink-0">
            <img src="/wisq-logo.svg" alt="Wisq" className="h-7 w-7" />
            {customerLogoBase64 && (
              <>
                <span className="text-gray-300 text-sm">&times;</span>
                <img src={customerLogoBase64} alt="Customer" className="h-7 w-auto max-w-[80px] object-contain" />
              </>
            )}
          </div>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-[#03143B] text-white'
                  : 'text-gray-600 hover:text-[#03143B] hover:bg-gray-100'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
