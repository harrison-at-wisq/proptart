'use client';

import React from 'react';

interface PlaceholderPanelProps {
  label?: string;
  height?: number;
  imageSrc?: string;
  darkTheme?: boolean;
}

export const PLACEHOLDER_PANEL_PLACEHOLDER = {
  label: 'Visual content — coming soon',
  height: 200,
};

export function PlaceholderPanel({
  label = PLACEHOLDER_PANEL_PLACEHOLDER.label,
  height = PLACEHOLDER_PANEL_PLACEHOLDER.height,
  imageSrc,
  darkTheme,
}: PlaceholderPanelProps) {
  if (imageSrc) {
    return (
      <div className="rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={label}
          className="w-full h-auto rounded-xl"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed flex items-center justify-center ${
        darkTheme
          ? 'border-white/20 bg-white/5'
          : 'border-gray-300 bg-gray-50'
      }`}
      style={{ minHeight: `${height}px` }}
    >
      <p className={`text-sm font-medium ${darkTheme ? 'text-white/40' : 'text-gray-400'}`}>
        {label}
      </p>
    </div>
  );
}
