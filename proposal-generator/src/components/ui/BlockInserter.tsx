'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CustomBlockType } from '@/types/proposal';
import { useLayoutMode } from './LayoutModeContext';

const BLOCK_TYPE_OPTIONS: { type: CustomBlockType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'text',
    label: 'Text Block',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    type: 'heading',
    label: 'Heading',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m6 0h8M3 16h4m6 0h8" />
      </svg>
    ),
  },
  {
    type: 'card-grid-2',
    label: '2-Column Cards',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zM19 4h-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zM9 14H5a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1zM19 14h-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1z" />
      </svg>
    ),
  },
  {
    type: 'card-grid-3',
    label: '3-Column Cards',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM10 5a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1V5zM16 5a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1V5z" />
      </svg>
    ),
  },
  {
    type: 'bullet-list',
    label: 'Bullet List',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        <circle cx="2" cy="6" r="1" fill="currentColor" />
        <circle cx="2" cy="10" r="1" fill="currentColor" />
        <circle cx="2" cy="14" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'numbered-list',
    label: 'Numbered Steps',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11" />
        <text x="2" y="8" fontSize="7" fill="currentColor" fontWeight="bold">1</text>
        <text x="2" y="14" fontSize="7" fill="currentColor" fontWeight="bold">2</text>
        <text x="2" y="20" fontSize="7" fill="currentColor" fontWeight="bold">3</text>
      </svg>
    ),
  },
];

interface BlockInserterProps {
  sectionKey: string;
  insertAtOrder: number;
  onInsert: (sectionKey: string, type: CustomBlockType, insertAtOrder: number) => void;
}

export function BlockInserter({ sectionKey, insertAtOrder, onInsert }: BlockInserterProps) {
  const { layoutMode } = useLayoutMode();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!layoutMode) return null;

  const handleSelect = (type: CustomBlockType) => {
    onInsert(sectionKey, type, insertAtOrder);
    setIsOpen(false);
  };

  return (
    <div className="col-span-12 relative flex items-center justify-center group/inserter print:hidden -my-1">
      {/* The line + button */}
      <div className="w-full h-px bg-gray-200 opacity-0 group-hover/inserter:opacity-100 transition-opacity" />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute z-10 w-6 h-6 rounded-full border-2 border-gray-300 bg-white text-gray-400 flex items-center justify-center text-sm leading-none hover:border-[#03143B] hover:text-[#03143B] hover:bg-gray-50 opacity-0 group-hover/inserter:opacity-100 transition-all"
        title="Add block"
      >
        +
      </button>

      {/* Type picker popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute top-full mt-2 z-30 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Add Block</p>
          {BLOCK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <span className="text-gray-400">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
