'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface SectionHeadingProps {
  text?: string;
  subtitle?: string;
  /** Hide the bottom accent border (default: true / shown) */
  showBorder?: boolean;
  onChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const SECTION_HEADING_PLACEHOLDER = {
  text: 'Section Title',
};

export function SectionHeading({ text = SECTION_HEADING_PLACEHOLDER.text, subtitle, showBorder = true, onChange, darkTheme }: SectionHeadingProps) {
  const borderClass = showBorder
    ? `pb-3 border-b-2 ${darkTheme ? 'border-white/30' : ''}`
    : '';
  const borderStyle = showBorder && !darkTheme ? { borderColor: 'var(--theme-primary)' } : undefined;

  return (
    <div className={borderClass} style={borderStyle}>
      {onChange ? (
        <DirectEditableText
          value={text}
          onChange={onChange}
          as="h2"
          className={`text-3xl font-bold ${darkTheme ? 'text-white' : ''}`}
          style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}
        />
      ) : (
        <h2 className={`text-3xl font-bold ${darkTheme ? 'text-white' : ''}`} style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}>{text}</h2>
      )}
      {subtitle && (
        <p className={`mt-1 ${darkTheme ? 'text-white/60' : 'text-gray-500'}`}>{subtitle}</p>
      )}
    </div>
  );
}
