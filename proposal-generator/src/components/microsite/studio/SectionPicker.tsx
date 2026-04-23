'use client';

import React from 'react';
import type { MicrositeSectionType } from '@/types/microsite';
import { MICROSITE_SECTION_CATALOG } from '../registry';

interface Props {
  onSelect: (type: MicrositeSectionType) => void;
  onClose: () => void;
}

export function SectionPicker({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#03143B]">Add a section</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pick a template. You can reorder, duplicate, or remove it later.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {MICROSITE_SECTION_CATALOG.map((entry) => (
              <button
                key={entry.type}
                onClick={() => onSelect(entry.type)}
                className="text-left p-4 rounded-lg border border-gray-200 hover:border-[#03143B] hover:shadow-md transition-all bg-white"
              >
                <div className="text-sm font-semibold text-[#03143B] mb-1">{entry.name}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{entry.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
