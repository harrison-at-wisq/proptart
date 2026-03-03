'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useLayoutMode } from './LayoutModeContext';

interface LayoutBlockProps {
  blockId: string;
  sectionKey: string;
  label?: string;
  colSpan: number;
  order: number;
  index: number;
  groupBlockIds?: string[];
  isDraggingAsGroup?: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onResize?: (blockId: string, newSpan: number) => void;
  onCrossSectionDrop?: (fromSection: string, blockIds: string[], toIndex: number) => void;
  onGroupDragStart?: (blockIds: string[]) => void;
  onGroupDragEnd?: () => void;
  children: React.ReactNode;
}

export function LayoutBlock({
  blockId,
  sectionKey,
  label,
  colSpan,
  order,
  index,
  groupBlockIds,
  isDraggingAsGroup = false,
  onReorder,
  onResize,
  onCrossSectionDrop,
  onGroupDragStart,
  onGroupDragEnd,
  children,
}: LayoutBlockProps) {
  const { layoutMode } = useLayoutMode();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ startX: number; startSpan: number } | null>(null);

  const dragIds = groupBlockIds || [blockId];

  const handleDragStart = (e: React.DragEvent) => {
    if (!layoutMode) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/layout-block', JSON.stringify({
      sectionKey,
      blockId,
      index,
      groupBlockIds: dragIds,
    }));
    setIsDragging(true);
    onGroupDragStart?.(dragIds);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!layoutMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!layoutMode) return;
    e.preventDefault();
    setIsDragOver(false);

    const raw = e.dataTransfer.getData('application/layout-block');
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as {
        sectionKey: string;
        blockId: string;
        index: number;
        groupBlockIds: string[];
      };

      if (data.sectionKey === sectionKey) {
        // Same section — reorder
        if (data.index !== index) {
          onReorder(data.index, index);
        }
      } else {
        // Cross-section move
        onCrossSectionDrop?.(data.sectionKey, data.groupBlockIds, index);
      }
    } catch {
      // Ignore invalid data
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragOver(false);
    onGroupDragEnd?.();
  };

  // Resize via mouse drag on right edge
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!layoutMode || !onResize || !blockRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { startX: e.clientX, startSpan: colSpan };

    const parentGrid = blockRef.current.parentElement;
    if (!parentGrid) return;
    const gridWidth = parentGrid.clientWidth;
    const colWidth = gridWidth / 12;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const deltaX = moveEvent.clientX - resizeStartRef.current.startX;
      const deltaCols = Math.round(deltaX / colWidth);
      const newSpan = Math.min(12, Math.max(3, resizeStartRef.current.startSpan + deltaCols));
      if (newSpan !== colSpan) {
        onResize(blockId, newSpan);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [layoutMode, onResize, blockId, colSpan]);

  const showResizeHandle = layoutMode && colSpan < 12 && onResize;
  const isGroupDragging = isDragging || isDraggingAsGroup;

  return (
    <div
      ref={blockRef}
      data-block-id={blockId}
      data-section-key={sectionKey}
      draggable={layoutMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`relative transition-all duration-150 ${
        layoutMode
          ? `ring-2 rounded-lg ${
              isDragOver ? 'ring-blue-500 bg-blue-50/30' : 'ring-blue-400/40'
            } ${isGroupDragging ? 'opacity-40 scale-[0.98]' : ''} ${
              isResizing ? 'ring-blue-500' : ''
            } cursor-grab active:cursor-grabbing`
          : ''
      }`}
      style={{
        gridColumn: `span ${colSpan}`,
        order,
      }}
    >
      {/* Layout mode: label badge */}
      {layoutMode && label && (
        <div className="absolute -top-2.5 left-3 z-10 bg-blue-500 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-sm">
          {label}
        </div>
      )}

      {/* Layout mode: pointer-events-none on children to prevent editing */}
      {layoutMode ? (
        <div className="pointer-events-none">{children}</div>
      ) : (
        children
      )}

      {/* Resize handle on right edge */}
      {showResizeHandle && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute top-0 right-0 w-2 h-full cursor-col-resize z-10 group/resize flex items-center justify-center hover:bg-blue-400/20 rounded-r-lg"
        >
          <div className="w-0.5 h-8 bg-blue-400/50 rounded group-hover/resize:bg-blue-500 transition-colors" />
        </div>
      )}
    </div>
  );
}
