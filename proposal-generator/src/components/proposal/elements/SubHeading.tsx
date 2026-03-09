'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface SubHeadingProps {
  text?: string;
  borderPosition?: 'top' | 'none';
  onChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const SUB_HEADING_PLACEHOLDER = {
  text: 'Sub-Section Title',
};

export function SubHeading({ text = SUB_HEADING_PLACEHOLDER.text, borderPosition = 'top', onChange, darkTheme }: SubHeadingProps) {
  const borderClass = borderPosition === 'top'
    ? `${darkTheme ? 'border-t border-white/20' : 'border-t border-gray-200'} pt-4`
    : '';

  return (
    <div className={borderClass}>
      {onChange ? (
        <DirectEditableText
          value={text}
          onChange={onChange}
          as="h3"
          className={`text-xl font-semibold ${darkTheme ? 'text-white' : ''}`}
          style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}
        />
      ) : (
        <h3 className={`text-xl font-semibold ${darkTheme ? 'text-white' : ''}`} style={darkTheme ? undefined : { color: 'var(--theme-primary)' }}>{text}</h3>
      )}
    </div>
  );
}
