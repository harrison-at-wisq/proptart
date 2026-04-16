'use client';

import React from 'react';

interface HarperProfileProps {
  darkTheme?: boolean;
}

export const HARPER_PROFILE_PLACEHOLDER = {};

export function HarperProfile() {
  return (
    <div className="flex items-start justify-center h-full pt-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Harper-profile.png"
        alt="Harper — AI HR Generalist"
        className="w-full h-auto rounded-lg object-cover"
      />
    </div>
  );
}
