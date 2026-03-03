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
    <div className={`pb-3 ${darkTheme ? 'border-b-2 border-white/30' : 'border-b-2 border-[#03143B]'}`}>
      {onChange ? (
        <DirectEditableText
          value={text}
          onChange={onChange}
          as="h2"
          className={`text-3xl font-bold ${darkTheme ? 'text-white' : 'text-[#03143B]'}`}
        />
      ) : (
        <h2 className={`text-3xl font-bold ${darkTheme ? 'text-white' : 'text-[#03143B]'}`}>{text}</h2>
      )}
      {subtitle && (
        <p className={`mt-1 ${darkTheme ? 'text-white/60' : 'text-gray-500'}`}>{subtitle}</p>
      )}
    </div>
  );
}
