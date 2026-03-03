'use client';

import React, { useState } from 'react';
import { WidgetItem } from '@/types/proposal';
import { useLayoutMode } from './LayoutModeContext';

interface WidgetItemHandlers<T extends WidgetItem> {
  updateField: (field: string, value: unknown) => void;
  remove: () => void;
}

interface WidgetGroupProps<T extends WidgetItem> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, handlers: WidgetItemHandlers<T>) => React.ReactNode;
  createNewItem: () => T;
  layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'list' | 'numbered-list';
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  className?: string;
}

export function WidgetGroup<T extends WidgetItem>({
  items,
  onChange,
  renderItem,
  createNewItem,
  layout = 'list',
  minItems = 0,
  maxItems,
  addLabel = 'Add item',
  className = '',
}: WidgetGroupProps<T>) {
  const { layoutMode } = useLayoutMode();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    onChange(newItems);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleUpdateField = (index: number, field: string, value: unknown) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    if (items.length <= minItems) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleAdd = () => {
    if (maxItems && items.length >= maxItems) return;
    onChange([...items, createNewItem()]);
  };

  const layoutClass = {
    'grid-2': 'grid grid-cols-2 gap-4',
    'grid-3': 'grid grid-cols-3 gap-4',
    'grid-4': 'grid grid-cols-4 gap-4',
    'list': 'space-y-4',
    'numbered-list': 'space-y-4',
  }[layout];

  return (
    <div className={className}>
      <div className={layoutClass}>
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable={!layoutMode}
            onDragStart={layoutMode ? undefined : handleDragStart(index)}
            onDragOver={layoutMode ? undefined : handleDragOver(index)}
            onDrop={layoutMode ? undefined : handleDrop(index)}
            onDragEnd={layoutMode ? undefined : handleDragEnd}
            className={`relative group transition-all duration-150 flex flex-col ${
              dragIndex === index
                ? 'opacity-40 scale-95'
                : overIndex === index && dragIndex !== null
                ? 'ring-2 ring-[#03143B]/30 ring-dashed'
                : ''
            }`}
          >
            {/* Drag handle + remove button — hidden in layout mode */}
            {!layoutMode && (
            <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
              <span
                className="w-6 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xs"
                title="Drag to reorder"
              >
                ⠿
              </span>
              {items.length > minItems && (
                <button
                  onClick={() => handleRemove(index)}
                  className="w-6 h-6 bg-red-50 border border-red-200 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            )}

            <div className="flex-1 [&>*]:h-full">
              {renderItem(item, index, {
                updateField: (field, value) => handleUpdateField(index, field, value),
                remove: () => handleRemove(index),
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add button — hidden in layout mode */}
      {!layoutMode && (!maxItems || items.length < maxItems) && (
        <button
          onClick={handleAdd}
          className="mt-3 flex items-center gap-2 text-sm text-[#03143B]/50 hover:text-[#03143B] transition-colors print:hidden"
        >
          <span className="w-6 h-6 border border-dashed border-current rounded flex items-center justify-center text-lg leading-none">
            +
          </span>
          {addLabel}
        </button>
      )}
    </div>
  );
}
