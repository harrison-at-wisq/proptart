'use client';

import React from 'react';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

// Visual parity with ExportEditor's undo/redo pill (top-left).
export function UndoRedoControls({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="fixed top-32 left-4 z-40 flex gap-1 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
        className="p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
        className="p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
        </svg>
      </button>
    </div>
  );
}
