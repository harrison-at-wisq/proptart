'use client';

import React, { useState } from 'react';
import type { SectionLayoutPreset } from '@/types/proposal';

interface SectionLayoutChooserProps {
  onConfirm: (name: string, preset: SectionLayoutPreset, darkTheme: boolean) => void;
  onCancel: () => void;
}

const PRESETS: { id: SectionLayoutPreset; name: string; diagram: React.ReactNode }[] = [
  {
    id: 'single-column',
    name: 'Single Column',
    diagram: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="flex-1 bg-current rounded-sm opacity-25" />
      </div>
    ),
  },
  {
    id: 'content-sidebar',
    name: 'Content + Sidebar',
    diagram: (
      <div className="w-full h-full flex gap-1 p-1.5">
        <div className="flex-[7] bg-current rounded-sm opacity-25" />
        <div className="flex-[5] bg-current rounded-sm opacity-15" />
      </div>
    ),
  },
  {
    id: 'equal-split',
    name: 'Equal Split',
    diagram: (
      <div className="w-full h-full flex gap-1 p-1.5">
        <div className="flex-1 bg-current rounded-sm opacity-25" />
        <div className="flex-1 bg-current rounded-sm opacity-25" />
      </div>
    ),
  },
  {
    id: 'hero-grid',
    name: 'Hero + Grid',
    diagram: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="flex-[2] bg-current rounded-sm opacity-25" />
        <div className="flex-[3] flex gap-1">
          <div className="flex-1 bg-current rounded-sm opacity-15" />
          <div className="flex-1 bg-current rounded-sm opacity-15" />
          <div className="flex-1 bg-current rounded-sm opacity-15" />
        </div>
      </div>
    ),
  },
  {
    id: 'two-col-bottom-banner',
    name: 'Two Col + Banner',
    diagram: (
      <div className="w-full h-full flex flex-col gap-1 p-1.5">
        <div className="flex-[3] flex gap-1">
          <div className="flex-1 bg-current rounded-sm opacity-25" />
          <div className="flex-1 bg-current rounded-sm opacity-25" />
        </div>
        <div className="flex-[2] bg-current rounded-sm opacity-15" />
      </div>
    ),
  },
];

export function SectionLayoutChooser({ onConfirm, onCancel }: SectionLayoutChooserProps) {
  const [name, setName] = useState('New Section');
  const [selectedPreset, setSelectedPreset] = useState<SectionLayoutPreset>('single-column');
  const [darkTheme, setDarkTheme] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Section</h3>

        {/* Section name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#03143B]/30 focus:border-[#03143B]"
            autoFocus
          />
        </div>

        {/* Layout presets */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`flex flex-col items-center rounded-lg border-2 p-1 transition-all ${
                  selectedPreset === preset.id
                    ? 'border-[#03143B] bg-[#03143B]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-full aspect-[8.5/11] text-[#03143B] ${selectedPreset === preset.id ? '' : 'text-gray-400'}`}>
                  {preset.diagram}
                </div>
                <span className={`text-[10px] mt-1 font-medium leading-tight text-center ${
                  selectedPreset === preset.id ? 'text-[#03143B]' : 'text-gray-500'
                }`}>
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dark theme toggle */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={darkTheme}
            onChange={(e) => setDarkTheme(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#03143B] focus:ring-[#03143B]"
          />
          <span className="text-sm text-gray-700">Dark background</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name.trim() || 'New Section', selectedPreset, darkTheme)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#03143B] rounded-lg hover:bg-[#03143B]/90 transition-colors"
          >
            Create Section
          </button>
        </div>
      </div>
    </div>
  );
}
