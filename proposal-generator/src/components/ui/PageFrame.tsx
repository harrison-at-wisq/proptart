'use client';

import React from 'react';

interface PageFrameProps {
  children: React.ReactNode;
  darkTheme?: boolean;
  className?: string;
}

/**
 * PageFrame wraps each proposal section page.
 * On screen it shows a visible dashed border to indicate the usable content area.
 * On print the border is hidden and page-break-after is enforced.
 *
 * If a custom className is provided (e.g. the cover page), it replaces the default
 * padding/layout so the caller has full control.
 */
export function PageFrame({ children, darkTheme, className }: PageFrameProps) {
  const hasCustomLayout = !!className;

  const baseClasses = [
    'page-frame',
    'page',
    // Visible page outline on screen, hidden on print
    'border border-dashed border-gray-300 print:border-transparent',
  ];

  if (darkTheme) {
    baseClasses.push('bg-[#03143B] text-white');
  } else {
    baseClasses.push('bg-white');
  }

  if (hasCustomLayout) {
    baseClasses.push(className);
  } else {
    baseClasses.push('p-12');
  }

  return (
    <section className={baseClasses.join(' ')}>
      {children}
    </section>
  );
}
