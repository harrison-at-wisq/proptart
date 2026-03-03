'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface CoverTitleBlockProps {
  eyebrow?: string;
  title?: string;
  onTitleChange?: (value: string) => void;
  quote?: string;
  onQuoteChange?: (value: string) => void;
  contactName?: string;
  contactTitle?: string;
  darkTheme?: boolean;
}

export const COVER_TITLE_BLOCK_PLACEHOLDER = {
  eyebrow: 'STRATEGIC PROPOSAL',
  title: 'Transforming [Company] with Intelligent HR Automation',
  quote: 'The future of HR is here — and it\'s conversational.',
  contactName: 'John Smith',
  contactTitle: 'VP of People',
};

export function CoverTitleBlock({
  eyebrow = COVER_TITLE_BLOCK_PLACEHOLDER.eyebrow,
  title = COVER_TITLE_BLOCK_PLACEHOLDER.title,
  onTitleChange,
  quote = COVER_TITLE_BLOCK_PLACEHOLDER.quote,
  onQuoteChange,
  contactName = COVER_TITLE_BLOCK_PLACEHOLDER.contactName,
  contactTitle = COVER_TITLE_BLOCK_PLACEHOLDER.contactTitle,
  darkTheme,
}: CoverTitleBlockProps) {
  const headingColor = darkTheme ? 'text-white' : 'text-[#03143B]';
  const dividerBg = darkTheme ? 'bg-white/50' : 'bg-[#03143B]';
  const quoteText = darkTheme ? 'text-white/80' : 'text-gray-700';
  const quoteBorder = darkTheme ? 'border-white/40' : 'border-[#03143B]';
  const metaText = darkTheme ? 'text-white/60' : 'text-gray-600';
  const nameText = darkTheme ? 'text-white' : 'text-gray-900';

  return (
    <div>
      <div className={`text-sm font-semibold ${headingColor} tracking-widest uppercase mb-2`}>
        {eyebrow}
      </div>
      {onTitleChange ? (
        <DirectEditableText
          value={title}
          onChange={onTitleChange}
          as="h1"
          className={`text-5xl font-bold ${headingColor} leading-tight mb-6`}
        />
      ) : (
        <h1 className={`text-5xl font-bold ${headingColor} leading-tight mb-6`}>{title}</h1>
      )}
      <div className={`w-24 h-1 ${dividerBg} mb-8`}></div>
      {quote && (
        <div className={`text-xl ${quoteText} italic border-l-4 ${quoteBorder} pl-4 mb-8 max-w-2xl`}>
          {onQuoteChange ? (
            <p>&ldquo;<DirectEditableText
              value={quote}
              onChange={onQuoteChange}
              as="span"
            />&rdquo;</p>
          ) : (
            <p>&ldquo;{quote}&rdquo;</p>
          )}
        </div>
      )}
      <div className={`text-lg ${metaText} space-y-1`}>
        <p>Prepared for <span className={`font-semibold ${nameText}`}>{contactName}</span>, {contactTitle}</p>
      </div>
    </div>
  );
}
