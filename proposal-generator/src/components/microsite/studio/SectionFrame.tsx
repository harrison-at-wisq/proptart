'use client';

import React from 'react';
import type { MicrositeSection } from '@/types/microsite';

interface Props {
  section: MicrositeSection;
  label: string;
  layoutMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDragOver: boolean;
  dragging: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleTheme: () => void;
  onInsertAfter: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  children: React.ReactNode;
}

// Wraps a rendered section with the layout-mode chrome: drag handle, move
// up/down, duplicate, delete, and an "add below" rail between sections.
// Chrome only renders when layoutMode=true; otherwise the children render
// with no visual change.
export function SectionFrame({
  section,
  label,
  layoutMode,
  isFirst,
  isLast,
  isDragOver,
  dragging,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleTheme,
  onInsertAfter,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragOver,
  onDrop,
  children,
}: Props) {
  const themeClass = section.theme === 'dark' ? 'ms-section-dark' : section.theme === 'light' ? 'ms-section-light' : '';

  if (!layoutMode) {
    return themeClass ? <div className={themeClass}>{children}</div> : <>{children}</>;
  }

  return (
    <div
      data-section-id={section.id}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative group ${dragging ? 'opacity-40' : ''} ${themeClass}`}
    >
      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-x-0 -top-1 h-1 bg-blue-500 rounded z-30 pointer-events-none" />
      )}

      {/* Section toolbar (top-right of section) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing p-2 rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="7" cy="5" r="1.25" />
            <circle cx="7" cy="10" r="1.25" />
            <circle cx="7" cy="15" r="1.25" />
            <circle cx="13" cy="5" r="1.25" />
            <circle cx="13" cy="10" r="1.25" />
            <circle cx="13" cy="15" r="1.25" />
          </svg>
        </div>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move up"
          className="p-2 rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Move down"
          className="p-2 rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={onToggleTheme}
          title={section.theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          className="p-2 rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50"
        >
          {section.theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" strokeWidth={2} />
              <path strokeLinecap="round" strokeWidth={2} d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3L4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate"
          className="p-2 rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-2 rounded-md bg-white/95 border border-gray-200 shadow-sm text-red-600 hover:bg-red-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4" />
          </svg>
        </button>
      </div>

      {/* Section label (top-left of section) */}
      <div className="absolute top-3 left-3 z-30 px-2 py-1 rounded-md bg-white/95 border border-gray-200 shadow-sm text-[11px] font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </div>

      {children}

      {/* "+ add below" rail between sections */}
      <div className="relative h-0 group/add">
        <button
          onClick={onInsertAfter}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-[#03143B] text-white text-xs font-medium opacity-0 group-hover/add:opacity-100 hover:bg-[#03143B]/90 transition-opacity z-20"
          title="Insert section here"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>
  );
}
