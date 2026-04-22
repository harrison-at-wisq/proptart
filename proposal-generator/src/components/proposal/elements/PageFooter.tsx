'use client';

import React from 'react';
import { DirectEditableText } from '@/components/ui/DirectEditableText';

interface PageFooterProps {
  logoSrc?: string;
  customerLogoSrc?: string;
  siteUrl?: string;
  date?: string;
  confidentialText?: string;
  showConfidential?: boolean;
  onSiteUrlChange?: (value: string) => void;
  onDateChange?: (value: string) => void;
  onConfidentialTextChange?: (value: string) => void;
  darkTheme?: boolean;
}

export const PAGE_FOOTER_PLACEHOLDER = {
  logoSrc: '/wisq-logo.svg',
  siteUrl: 'wisq.com',
  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  confidentialText: 'Confidential',
  showConfidential: true,
};

export function PageFooter({
  logoSrc = PAGE_FOOTER_PLACEHOLDER.logoSrc,
  customerLogoSrc,
  siteUrl = PAGE_FOOTER_PLACEHOLDER.siteUrl,
  date = PAGE_FOOTER_PLACEHOLDER.date,
  confidentialText = PAGE_FOOTER_PLACEHOLDER.confidentialText,
  showConfidential = PAGE_FOOTER_PLACEHOLDER.showConfidential,
  onSiteUrlChange,
  onDateChange,
  onConfidentialTextChange,
  darkTheme,
}: PageFooterProps) {
  const textColor = darkTheme ? 'text-white/50' : 'text-gray-500';
  const borderColor = darkTheme ? 'border-white/20' : 'border-gray-200';
  const effectiveLogoSrc = darkTheme ? '/wisq-logo-white.svg' : logoSrc;

  return (
    <div className={`flex justify-between items-center pt-6 border-t ${borderColor}`}>
      <div className="flex items-center gap-3">
        <img src={effectiveLogoSrc} alt="Logo" className="h-10 w-10" />
        {customerLogoSrc && (
          <>
            <span className={`${textColor} text-sm`}>&times;</span>
            <img src={customerLogoSrc} alt="Customer" className="h-10 w-auto max-w-[80px] object-contain" />
          </>
        )}
        {onSiteUrlChange ? (
          <DirectEditableText
            value={siteUrl}
            onChange={onSiteUrlChange}
            as="p"
            className={`${textColor} text-sm`}
          />
        ) : (
          <p className={`${textColor} text-sm`}>{siteUrl}</p>
        )}
      </div>
      <div className={`text-right ${textColor} text-sm`}>
        {showConfidential && (
          onConfidentialTextChange ? (
            <DirectEditableText
              value={confidentialText}
              onChange={onConfidentialTextChange}
              as="p"
              className=""
            />
          ) : (
            <p>{confidentialText}</p>
          )
        )}
        {onDateChange ? (
          <DirectEditableText
            value={date}
            onChange={onDateChange}
            as="p"
            className=""
          />
        ) : (
          <p>{date}</p>
        )}
      </div>
    </div>
  );
}
