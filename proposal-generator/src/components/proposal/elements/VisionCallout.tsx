'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface VisionCalloutProps {
  text?: string;
  onChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const VISION_CALLOUT_PLACEHOLDER = {
  text: 'A bold vision statement that captures the strategic opportunity and inspires decisive action.',
};

export function VisionCallout({ text = VISION_CALLOUT_PLACEHOLDER.text, onChange, darkTheme }: VisionCalloutProps) {
  const borderColor = darkTheme ? 'border-white/50' : '';
  const textColor = darkTheme ? 'text-white' : '';
  const lightStyle = darkTheme ? undefined : { color: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' } as React.CSSProperties;

  if (onChange) {
    return (
      <div className={`text-lg font-semibold ${textColor} italic border-l-4 ${borderColor} pl-4`} style={lightStyle}>
        <DirectEditableText
          value={text}
          onChange={onChange}
          as="span"
        />
      </div>
    );
  }

  return (
    <div className={`text-lg font-semibold ${textColor} italic border-l-4 ${borderColor} pl-4`} style={lightStyle}>
      {text}
    </div>
  );
}
