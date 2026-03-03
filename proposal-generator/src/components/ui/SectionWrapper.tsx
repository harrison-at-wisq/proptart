'use client';

import React from 'react';
import { SectionVisibility } from '@/types/proposal';

interface SectionWrapperProps {
  sectionKey: keyof SectionVisibility;
  visible: boolean;
  onToggleVisibility: (key: keyof SectionVisibility) => void;
  children: React.ReactNode;
  className?: string;
}

export function SectionWrapper({
  sectionKey,
  visible,
  onToggleVisibility,
  children,
  className = '',
}: SectionWrapperProps) {
  if (!visible) return null;

  return (
    <div className={`relative group/section ${className}`} data-section-key={sectionKey}>
      {/* Hide section button */}
      <button
        onClick={() => onToggleVisibility(sectionKey)}
        className="absolute top-4 right-4 z-10 p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover/section:opacity-100 transition-opacity print:hidden"
        title="Hide this section"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
      </button>

      {children}
    </div>
  );
}
