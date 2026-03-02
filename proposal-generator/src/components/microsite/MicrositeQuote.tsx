'use client';

import React from 'react';
import { QuoteSection } from '@/types/proposal';
import { getSelectedQuoteForSection } from '@/lib/customer-quotes';

interface Props {
  selectedQuotes: string[] | undefined;
  section: QuoteSection;
  dark?: boolean;
}

export function MicrositeQuote({ selectedQuotes, section, dark = false }: Props) {
  if (!selectedQuotes || selectedQuotes.length === 0) return null;
  const quote = getSelectedQuoteForSection(selectedQuotes, section);
  if (!quote) return null;

  return (
    <div className={`mt-10 pl-5 border-l-4 ${dark ? 'border-white/40' : 'border-[#03143B]'}`}>
      <p className={`text-base italic leading-relaxed ${dark ? 'text-white/85' : 'text-gray-700'}`}>
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className={`text-sm mt-2 ${dark ? 'text-white/50' : 'text-gray-500'}`}>
        &mdash; {quote.attribution}
      </p>
    </div>
  );
}
