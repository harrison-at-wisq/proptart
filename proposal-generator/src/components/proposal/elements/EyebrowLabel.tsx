'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface EyebrowLabelProps {
  text?: string;
  onChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const EYEBROW_LABEL_PLACEHOLDER = {
  text: 'CATEGORY LABEL',
};

export function EyebrowLabel({ text = EYEBROW_LABEL_PLACEHOLDER.text, onChange, darkTheme }: EyebrowLabelProps) {
  if (onChange) {
    return (
      <DirectEditableText
        value={text}
        onChange={onChange}
        as="div"
        className={`text-sm font-semibold tracking-widest uppercase mb-2 ${darkTheme ? 'text-white/70' : 'text-[#03143B]'}`}
      />
    );
  }

  return (
    <div className={`text-sm font-semibold tracking-widest uppercase mb-2 ${darkTheme ? 'text-white/70' : 'text-[#03143B]'}`}>
      {text}
    </div>
  );
}
