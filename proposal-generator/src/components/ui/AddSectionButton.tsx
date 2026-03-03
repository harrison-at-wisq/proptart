'use client';

import React, { useState } from 'react';
import { useLayoutMode } from './LayoutModeContext';
import { SectionLayoutChooser } from './SectionLayoutChooser';
import type { SectionLayoutPreset } from '@/types/proposal';

interface AddSectionButtonProps {
  onAddSection: (name: string, preset: SectionLayoutPreset, darkTheme: boolean) => void;
}

export function AddSectionButton({ onAddSection }: AddSectionButtonProps) {
  const { layoutMode } = useLayoutMode();
  const [showChooser, setShowChooser] = useState(false);

  if (!layoutMode) return null;

  return (
    <>
      <button
        onClick={() => setShowChooser(true)}
        className="fixed bottom-6 right-20 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#03143B] text-white rounded-full shadow-lg hover:bg-[#03143B]/90 transition-all duration-200 print:hidden"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-medium">Add Section</span>
      </button>

      {showChooser && (
        <SectionLayoutChooser
          onConfirm={(name, preset, darkTheme) => {
            onAddSection(name, preset, darkTheme);
            setShowChooser(false);
          }}
          onCancel={() => setShowChooser(false)}
        />
      )}
    </>
  );
}
