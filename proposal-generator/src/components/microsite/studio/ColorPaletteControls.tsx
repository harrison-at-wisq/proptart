'use client';

import React, { useState } from 'react';
import type { ColorPalette } from '@/types/proposal';
import { DEFAULT_COLOR_PALETTE } from '@/types/proposal';

interface Props {
  palette: ColorPalette;
  onChange: (next: ColorPalette) => void;
}

// Visual parity with ExportEditor's bottom-left color palette control.
export function ColorPaletteControls({ palette, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const isModified =
    palette.primary !== DEFAULT_COLOR_PALETTE.primary ||
    palette.accent !== DEFAULT_COLOR_PALETTE.accent ||
    palette.background !== DEFAULT_COLOR_PALETTE.background;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg transition-all duration-200 ${
          open ? 'bg-white ring-2 ring-blue-400' : 'bg-white hover:bg-gray-50 border border-gray-200'
        }`}
        title="Color Palette"
      >
        <div className="flex gap-0.5">
          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.primary }} />
          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.accent }} />
          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: palette.background }} />
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-14 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Color Palette</h4>
            {isModified && (
              <button
                onClick={() => onChange(DEFAULT_COLOR_PALETTE)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-3">
            {([
              { key: 'primary' as const, label: 'Primary' },
              { key: 'accent' as const, label: 'Accent' },
              { key: 'background' as const, label: 'Background' },
            ]).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={palette[key]}
                  onChange={(e) => onChange({ ...palette, [key]: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-200 flex-shrink-0"
                />
                <label className="text-xs font-medium text-gray-700 flex-1">{label}</label>
                <input
                  type="text"
                  value={palette[key]}
                  onChange={(e) => onChange({ ...palette, [key]: e.target.value })}
                  className="w-20 text-xs font-mono px-2 py-1 rounded border border-gray-200"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
