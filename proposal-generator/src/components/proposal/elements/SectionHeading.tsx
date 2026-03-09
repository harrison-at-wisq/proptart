'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface SectionHeadingProps {
  text?: string;
  subtitle?: string;
  onChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const SECTION_HEADING_PLACEHOLDER = {
  text: 'Section Title',
};

export function SectionHeading({ text = SECTION_HEADING_PLACEHOLDER.text, subtitle, onChange, darkTheme }: SectionHeadingProps) {
  return (
    <div className={`pb-3 border-b-2 ${darkTheme ? 'border-white/30' : ''}`} style={darkTheme ? undefined : { borderColor: 'var(--theme-primary)' }}>
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
