'use client';

import React from 'react';

interface DividerLineProps {
  width?: string;
  darkTheme?: boolean;
}

export const DIVIDER_LINE_PLACEHOLDER = {};

export function DividerLine({ width = 'w-24', darkTheme }: DividerLineProps) {
  return (
    <div className={`${width} h-1 ${darkTheme ? 'bg-white/50' : 'bg-[#03143B]'}`} />
  );
}
