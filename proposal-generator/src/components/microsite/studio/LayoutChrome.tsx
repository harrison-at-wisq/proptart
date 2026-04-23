'use client';

import React from 'react';

// Small remove button layered over an editable card in layout mode.
export function RemoveItemButton({ onClick, title = 'Remove' }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 shadow flex items-center justify-center transition-colors z-10"
      title={title}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// Dashed placeholder card for adding a new item at the end of an item grid.
export function AddItemCard({
  label,
  onClick,
  className = '',
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors flex flex-col items-center justify-center min-h-[8rem] ${className}`}
      title={label}
    >
      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Row of restore chips for items the user has hidden, with a label.
export function HiddenItemsBar({
  items,
  onRestore,
  tone = 'amber',
}: {
  items: Array<{ key: string; label: string }>;
  onRestore: (key: string) => void;
  tone?: 'amber' | 'dark';
}) {
  if (items.length === 0) return null;
  const palette =
    tone === 'dark'
      ? 'bg-white/10 border-white/20 text-white/80'
      : 'bg-amber-50 border-amber-200 text-amber-800';
  const chipPalette =
    tone === 'dark'
      ? 'bg-white/10 border-white/20 hover:bg-white/20'
      : 'bg-white border-amber-200 hover:bg-amber-100';

  return (
    <div className={`mt-6 p-3 rounded-lg border text-xs flex items-center gap-2 flex-wrap ${palette}`}>
      <span className="font-medium">Hidden:</span>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onRestore(item.key)}
          className={`px-2 py-0.5 rounded-full border transition-colors ${chipPalette}`}
          title="Restore"
        >
          {item.label} &bull; restore
        </button>
      ))}
    </div>
  );
}
