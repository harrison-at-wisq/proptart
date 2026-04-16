'use client';

import React from 'react';

interface CoverImageProps {
  src?: string;
  darkTheme?: boolean;
}

export const COVER_IMAGE_PLACEHOLDER = {
  src: '/workplace_image.png',
};

export function CoverImage({ src = COVER_IMAGE_PLACEHOLDER.src }: CoverImageProps) {
  return (
    <img
      src={src}
      alt=""
      className="w-full rounded-lg object-cover"
      style={{ maxHeight: '280px' }}
    />
  );
}
