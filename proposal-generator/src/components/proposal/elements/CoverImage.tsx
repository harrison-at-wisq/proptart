'use client';

import React, { useRef } from 'react';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';

interface CoverImageProps {
  src?: string;
  onSrcChange?: (src: string) => void;
  darkTheme?: boolean;
}

export const COVER_IMAGE_PLACEHOLDER = {
  src: '/workplace_image.png',
};

export function CoverImage({ src = COVER_IMAGE_PLACEHOLDER.src, onSrcChange }: CoverImageProps) {
  const { layoutMode } = useLayoutMode();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSrcChange) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSrcChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const showUpload = layoutMode && onSrcChange;

  return (
    <div className="relative group">
      <img
        src={src}
        alt=""
        className="w-full rounded-lg object-cover"
        style={{ maxHeight: '280px' }}
      />
      {showUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-gray-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Replace Image
            </div>
          </button>
        </>
      )}
    </div>
  );
}
