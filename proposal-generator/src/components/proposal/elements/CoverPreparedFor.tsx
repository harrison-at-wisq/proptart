'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface CoverPreparedForProps {
  contactName?: string;
  onContactNameChange?: (value: string) => void;
  contactTitle?: string;
  onContactTitleChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const COVER_PREPARED_FOR_PLACEHOLDER = {
  contactName: 'John Smith',
  contactTitle: 'VP of People',
};

export function CoverPreparedFor({
  contactName = COVER_PREPARED_FOR_PLACEHOLDER.contactName,
  onContactNameChange,
  contactTitle = COVER_PREPARED_FOR_PLACEHOLDER.contactTitle,
  onContactTitleChange,
  darkTheme,
}: CoverPreparedForProps) {
  const metaText = darkTheme ? 'text-white/60' : 'text-gray-600';
  const nameText = darkTheme ? 'text-white' : 'text-gray-900';

  return (
    <div className={`text-lg ${metaText}`}>
      <p>
        Prepared for{' '}
        {onContactNameChange ? (
          <DirectEditableText value={contactName} onChange={onContactNameChange} as="span" className={`font-semibold ${nameText}`} />
        ) : (
          <span className={`font-semibold ${nameText}`}>{contactName}</span>
        )}
        ,{' '}
        {onContactTitleChange ? (
          <DirectEditableText value={contactTitle} onChange={onContactTitleChange} as="span" />
        ) : (
          <>{contactTitle}</>
        )}
      </p>
    </div>
  );
}
