'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface CustomerQuoteProps {
  text?: string;
  attribution?: string;
  onTextChange?: (value: string) => void;
  onAttributionChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const CUSTOMER_QUOTE_PLACEHOLDER = {
  text: 'This solution transformed how our team operates — the impact was immediate and measurable.',
  attribution: 'Customer Name, VP of People Operations',
};

export function CustomerQuote({
  text = CUSTOMER_QUOTE_PLACEHOLDER.text,
  attribution = CUSTOMER_QUOTE_PLACEHOLDER.attribution,
  onTextChange,
  onAttributionChange,
  darkTheme,
}: CustomerQuoteProps) {
  if (!text) return null;

  const borderColor = darkTheme ? 'border-white/50' : 'border-[#4d65ff]';
  const quoteColor = darkTheme ? 'text-white/90' : 'text-gray-700';
  const attrColor = darkTheme ? 'text-white/60' : 'text-gray-500';

  return (
    <div className={`pl-5 border-l-4 ${borderColor}`}>
      {onTextChange ? (
        <p className={`text-sm italic leading-relaxed ${quoteColor}`}>
          &ldquo;<DirectEditableText
            value={text}
            onChange={onTextChange}
            as="span"
          />&rdquo;
        </p>
      ) : (
        <p className={`text-sm italic leading-relaxed ${quoteColor}`}>
          &ldquo;{text}&rdquo;
        </p>
      )}
      {attribution && (
        onAttributionChange ? (
          <p className={`text-xs mt-2 ${attrColor}`}>
            &mdash; <DirectEditableText
              value={attribution}
              onChange={onAttributionChange}
              as="span"
            />
          </p>
        ) : (
          <p className={`text-xs mt-2 ${attrColor}`}>
            &mdash; {attribution}
          </p>
        )
      )}
    </div>
  );
}
