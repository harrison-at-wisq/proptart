'use client';

import React, { useRef, useCallback, useState } from 'react';
import { useLayoutMode } from '@/components/ui/LayoutModeContext';

interface SpacerProps {
  height?: number;
  onHeightChange?: (height: number) => void;
  darkTheme?: boolean;
}

export const SPACER_PLACEHOLDER = {
  height: 24,
};

export function Spacer({ height = SPACER_PLACEHOLDER.height, onHeightChange, darkTheme }: SpacerProps) {
  const { layoutMode } = useLayoutMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);

  const displayHeight = previewHeight ?? height;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onHeightChange) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    dragStartRef.current = { startY: e.clientY, startHeight: height };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const delta = moveEvent.clientY - dragStartRef.current.startY;
      const newHeight = Math.max(8, Math.min(200, dragStartRef.current.startHeight + delta));
      setPreviewHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (dragStartRef.current) {
        const finalHeight = previewHeight ?? height;
        // Read from the latest preview
        const el = containerRef.current;
        if (el) {
          const computed = parseInt(el.style.height);
          if (!isNaN(computed) && computed >= 8) {
            onHeightChange(computed);
          }
        }
      }
      dragStartRef.current = null;
      setIsResizing(false);
      setPreviewHeight(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onHeightChange, height, previewHeight]);

  // Use a ref-based approach for final height on mouseup
  const heightRef = useRef(height);
  heightRef.current = previewHeight ?? height;

  const handleMouseDownStable = useCallback((e: React.MouseEvent) => {
    if (!onHeightChange) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(8, Math.min(200, startHeight + delta));
      setPreviewHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const final = heightRef.current;
      setPreviewHeight(null);
      onHeightChange(final);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onHeightChange, height]);

  const handleColor = darkTheme ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
  const handleColorHover = darkTheme ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';

  return (
    <div
      ref={containerRef}
      style={{ height: `${displayHeight}px` }}
      className="relative w-full select-none"
    >
      {layoutMode && onHeightChange && (
        <div
          onMouseDown={handleMouseDownStable}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 48,
            height: 8,
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => {
            const dots = e.currentTarget.querySelector('span');
            if (dots) dots.style.background = handleColorHover;
          }}
          onMouseLeave={(e) => {
            const dots = e.currentTarget.querySelector('span');
            if (dots) dots.style.background = handleColor;
          }}
        >
          <span
            style={{
              width: 24,
              height: 3,
              borderRadius: 2,
              background: isResizing ? handleColorHover : handleColor,
              transition: 'background 0.15s',
            }}
          />
        </div>
      )}
    </div>
  );
}
