'use client';

import React from 'react';
import { useLayoutMode } from './LayoutModeContext';

/**
 * Per-item layout-mode affordance: a "remove" × button absolutely positioned at the top-right
 * of whatever container it's placed in. Only visible in layout mode, fades in on hover.
 *
 * Usage: wrap the item's container with `group relative` and drop <RemoveItemButton> inside.
 */
export function RemoveItemButton({
  onRemove,
  canRemove = true,
  title = 'Remove',
  className = '',
}: {
  onRemove: () => void;
  canRemove?: boolean;
  title?: string;
  className?: string;
}) {
  const { layoutMode } = useLayoutMode();
  if (!layoutMode || !canRemove) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className={`absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-50 border border-red-200 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity print:hidden pointer-events-auto ${className}`}
      title={title}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

/**
 * Add-new-item button: rendered after a list of items, visible only in layout mode.
 */
export function AddItemButton({
  onAdd,
  label = 'Add item',
  className = '',
  darkTheme = false,
}: {
  onAdd: () => void;
  label?: string;
  className?: string;
  darkTheme?: boolean;
}) {
  const { layoutMode } = useLayoutMode();
  if (!layoutMode) return null;

  const textCls = darkTheme
    ? 'text-white/40 hover:text-white/80'
    : 'text-[#03143B]/50 hover:text-[#03143B]';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
      }}
      className={`flex items-center gap-2 text-sm ${textCls} transition-colors print:hidden pointer-events-auto ${className}`}
    >
      <span className="w-6 h-6 border border-dashed border-current rounded flex items-center justify-center text-lg leading-none">
        +
      </span>
      {label}
    </button>
  );
}
