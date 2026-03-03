'use client';

import React from 'react';

interface PageFooterProps {
  logoSrc?: string;
  siteUrl?: string;
  date?: string;
  showConfidential?: boolean;
  darkTheme?: boolean;
}

export const PAGE_FOOTER_PLACEHOLDER = {
  logoSrc: '/wisq-logo.svg',
  siteUrl: 'wisq.com',
  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  showConfidential: true,
};

export function PageFooter({
  logoSrc = PAGE_FOOTER_PLACEHOLDER.logoSrc,
  siteUrl = PAGE_FOOTER_PLACEHOLDER.siteUrl,
  date = PAGE_FOOTER_PLACEHOLDER.date,
  showConfidential = PAGE_FOOTER_PLACEHOLDER.showConfidential,
  darkTheme,
}: PageFooterProps) {
  const textColor = darkTheme ? 'text-white/50' : 'text-gray-500';
  const borderColor = darkTheme ? 'border-white/20' : 'border-gray-200';

  return (
    <div className={`flex justify-between items-center pt-6 border-t ${borderColor}`}>
      <div className="flex items-center gap-3">
        <img src={logoSrc} alt="Logo" className="h-10 w-10" />
        <p className={`${textColor} text-sm`}>{siteUrl}</p>
      </div>
      <div className={`text-right ${textColor} text-sm`}>
        {showConfidential && <p>Confidential</p>}
        <p>{date}</p>
      </div>
    </div>
  );
}
