'use client';

import React from 'react';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';

interface Props {
  blockId: string;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
}

// Wraps a sub-block of a section with up/down move chrome when layoutMode is
// on and the host section is editable. In text-edit mode (layoutMode off) or
// read-only contexts, renders children bare — no visual change.
export function SubBlock({ blockId, isFirst, isLast, canEdit, onMoveUp, onMoveDown, children }: Props) {
  const { layoutMode } = useLayoutMode();
  if (!layoutMode || !canEdit) return <>{children}</>;

  return (
    <div data-sub-block={blockId} className="relative group/sub">
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move block up"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Move block down"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white/95 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

// Helper: resolve a blockOrder array against a default list. If the persisted
// order is missing or misaligned (ids added/removed since save), fall back to
// the default order augmented with the persisted one's ordering where valid.
export function resolveBlockOrder(persisted: string[] | undefined, defaults: readonly string[]): string[] {
  if (!persisted) return [...defaults];
  const persistedSet = new Set(persisted);
  const defaultSet = new Set(defaults);
  const kept = persisted.filter((id) => defaultSet.has(id));
  const missing = defaults.filter((id) => !persistedSet.has(id));
  return [...kept, ...missing];
}
