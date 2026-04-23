'use client';

import React from 'react';

interface Props {
  active: boolean;
  onToggle: () => void;
}

// Visual parity with the PDF editor's bottom-right layout-mode toggle
// (see src/app/p/[id]/export/page.tsx).
export function LayoutModeToggle({ active, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
        active
          ? 'bg-blue-500 text-white hover:bg-blue-600 ring-4 ring-blue-200'
          : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
      title={active ? 'Exit layout mode' : 'Enter layout mode'}
    >
      {active ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      )}
    </button>
  );
}
