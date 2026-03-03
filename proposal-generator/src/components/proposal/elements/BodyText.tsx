'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface BodyTextProps {
  text?: string;
  onChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const BODY_TEXT_PLACEHOLDER = {
  text: 'Provide a clear overview of the key points, establishing context and setting expectations for what follows in this section.',
};

export function BodyText({ text = BODY_TEXT_PLACEHOLDER.text, onChange, darkTheme }: BodyTextProps) {
  if (onChange) {
    return (
      <DirectEditableText
        value={text}
        onChange={onChange}
        as="p"
        className={darkTheme ? 'text-white/80' : 'text-gray-700'}
        multiline
      />
    );
  }

  return (
    <p className={darkTheme ? 'text-white/80' : 'text-gray-700'}>{text}</p>
  );
}
