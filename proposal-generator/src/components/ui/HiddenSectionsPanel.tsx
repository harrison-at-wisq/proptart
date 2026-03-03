'use client';

import React from 'react';
import { SectionVisibility } from '@/types/proposal';

const SECTION_LABELS: Record<keyof SectionVisibility, string> = {
  cover: 'Cover Page',
  executiveSummary: 'Executive Summary & Current State',
  meetHarper: 'The Solution: Meet Harper',
  investmentCase: 'Investment Case',
  securityIntegration: 'Security & Integration',
  whyNow: 'Why Now',
  nextSteps: 'Next Steps',
};

interface HiddenSectionsPanelProps {
  visibility: SectionVisibility;
  onRestore: (key: keyof SectionVisibility) => void;
  onRestoreAll: () => void;
}

export function HiddenSectionsPanel({
  visibility,
  onRestore,
  onRestoreAll,
}: HiddenSectionsPanelProps) {
  const hiddenSections = (Object.entries(visibility) as [keyof SectionVisibility, boolean][])
    .filter(([, visible]) => !visible);

  if (hiddenSections.length === 0) return null;

  return (
    <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg p-6 mt-8 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-amber-800">
          Hidden Sections ({hiddenSections.length})
        </h3>
        <button
          onClick={onRestoreAll}
          className="text-sm text-amber-600 hover:text-amber-800 font-medium"
        >
          Restore All
        </button>
      </div>
      <div className="space-y-2">
        {hiddenSections.map(([key]) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-sm text-amber-700">{SECTION_LABELS[key]}</span>
            <button
              onClick={() => onRestore(key)}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium px-3 py-1 bg-amber-100 rounded hover:bg-amber-200 transition-colors"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
