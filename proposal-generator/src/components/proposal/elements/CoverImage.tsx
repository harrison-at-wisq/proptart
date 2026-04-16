'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';

interface CoverImageProps {
  src?: string;
  maxHeight?: number;
  onSrcChange?: (src: string) => void;
  onMaxHeightChange?: (height: number) => void;
  darkTheme?: boolean;
}

export const COVER_IMAGE_PLACEHOLDER = {
  src: '/workplace_image.png',
  maxHeight: 340,
};

export function CoverImage({
  src = COVER_IMAGE_PLACEHOLDER.src,
  maxHeight = COVER_IMAGE_PLACEHOLDER.maxHeight,
  onSrcChange,
  onMaxHeightChange,
}: CoverImageProps) {
  const { layoutMode } = useLayoutMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const heightRef = useRef(maxHeight);
  heightRef.current = previewHeight ?? maxHeight;

  const displayHeight = previewHeight ?? maxHeight;

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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onMaxHeightChange) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = maxHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(80, Math.min(600, startHeight + delta));
      setPreviewHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const final = heightRef.current;
      setPreviewHeight(null);
      onMaxHeightChange(final);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onMaxHeightChange, maxHeight]);

  const showUpload = layoutMode && onSrcChange;
  const showResize = layoutMode && onMaxHeightChange;

  return (
    <div className="relative group select-none">
      <img
        src={src}
        alt=""
        className="w-full rounded-lg object-cover"
        style={{ maxHeight: `${displayHeight}px` }}
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
      {showResize && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 48,
            height: 10,
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            zIndex: 10,
          }}
        >
          <span
            style={{
              width: 24,
              height: 3,
              borderRadius: 2,
              background: isResizing ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
              transition: 'background 0.15s',
            }}
          />
        </div>
      )}
    </div>
  );
}
