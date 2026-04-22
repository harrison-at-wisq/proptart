'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface PlaceholderPanelProps {
  label?: string;
  height?: number;
  imageSrc?: string;
  onLabelChange?: (value: string) => void;
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
  onLabelChange,
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

  const labelCls = `text-sm font-medium ${darkTheme ? 'text-white/40' : 'text-gray-400'}`;

  return (
    <div
      className={`rounded-xl border-2 border-dashed flex items-center justify-center ${
        darkTheme
          ? 'border-white/20 bg-white/5'
          : 'border-gray-300 bg-gray-50'
      }`}
      style={{ minHeight: `${height}px` }}
    >
      {onLabelChange ? (
        <DirectEditableText value={label} onChange={onLabelChange} as="p" className={labelCls} />
      ) : (
        <p className={labelCls}>{label}</p>
      )}
    </div>
  );
}
